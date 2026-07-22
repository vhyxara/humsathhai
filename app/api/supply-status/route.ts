import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/shared/prisma'
import { getSession } from '@/lib/auth/session'
import { authorizeSupplyStatusUpdate } from '@/lib/checkpoints/checkpointVolunteer'

const SupplyStatusUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['urgent', 'low', 'enough']),
})

export async function PATCH(request: Request) {
  const body = await request.json()
  const parsed = SupplyStatusUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const authorization = await authorizeSupplyStatusUpdate(session.id, parsed.data.id, parsed.data.status)

  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.httpStatus })
  }

  const updated = await prisma.supplyStatus.update({
    where: { id: authorization.supplyStatusId },
    data: { status: authorization.status },
    select: { id: true, item: true, status: true, updated_at: true },
  })

  return NextResponse.json(updated)
}
