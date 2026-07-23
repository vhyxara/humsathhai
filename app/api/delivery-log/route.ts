import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/shared/prisma'
import { getSession } from '@/lib/auth/session'
import { getEntryVolunteerContext, createDeliveryLog } from '@/lib/checkpoints/checkpointVolunteer'
import { SUPPLY_ITEMS } from '@/lib/checkpoints/supplyItems'

const CreateDeliveryLogSchema = z.object({
  checkpoint_id: z.string().min(1),
  item: z.enum(SUPPLY_ITEMS),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const entryVolunteer = await getEntryVolunteerContext(session.id)
  if (!entryVolunteer || entryVolunteer.role !== 'entry' || !entryVolunteer.entry_point_id) {
    return NextResponse.json({ error: 'Not authorized as an assigned Entry Volunteer' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateDeliveryLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Independent ownership check -- looks up the checkpoint by its own id
  // and reads ITS entry_point_id fresh from the DB, never trusting the
  // request's framing of which entry point it belongs to.
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: parsed.data.checkpoint_id },
    select: { entry_point_id: true },
  })
  if (!checkpoint || checkpoint.entry_point_id !== entryVolunteer.entry_point_id) {
    return NextResponse.json({ error: 'Not authorized to log a delivery for this checkpoint' }, { status: 403 })
  }

  const created = await createDeliveryLog(session.id, parsed.data.checkpoint_id, parsed.data.item)

  return NextResponse.json(created, { status: 201 })
}
