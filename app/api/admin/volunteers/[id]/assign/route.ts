import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/shared/prisma'
import { getSession } from '@/lib/auth/session'
import { requireSuperAdmin } from '@/lib/auth/adminAuth'

// Only assigns against EXISTING Checkpoint/EntryPoint rows -- this route
// never creates one. Which field gets updated is derived from the
// Volunteer's own `role`, read fresh from the DB, never from client input.
const AssignSchema = z.object({
  target_id: z.string().min(1),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const isSuperAdmin = await requireSuperAdmin(session.id)
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = AssignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { id } = await params
  const volunteer = await prisma.volunteer.findUnique({ where: { id }, select: { role: true } })
  if (!volunteer) {
    return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 })
  }

  if (volunteer.role === 'checkpoint') {
    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: parsed.data.target_id },
      select: { id: true },
    })
    if (!checkpoint) {
      return NextResponse.json({ error: 'Checkpoint not found' }, { status: 400 })
    }
    const updated = await prisma.volunteer.update({
      where: { id },
      data: { checkpoint_id: checkpoint.id },
      select: { id: true, checkpoint_id: true },
    })
    return NextResponse.json(updated)
  }

  const entryPoint = await prisma.entryPoint.findUnique({
    where: { id: parsed.data.target_id },
    select: { id: true },
  })
  if (!entryPoint) {
    return NextResponse.json({ error: 'Entry point not found' }, { status: 400 })
  }
  const updated = await prisma.volunteer.update({
    where: { id },
    data: { entry_point_id: entryPoint.id },
    select: { id: true, entry_point_id: true },
  })
  return NextResponse.json(updated)
}
