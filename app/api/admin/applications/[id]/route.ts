import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/shared/prisma'
import { getSession } from '@/lib/auth/session'
import { requireSuperAdmin } from '@/lib/auth/adminAuth'

// Only 'rejected' is accepted here -- marking an application 'approved'
// happens exclusively as a side effect of a successful volunteer creation
// in app/api/admin/volunteers/route.ts, never as a direct status write, so
// an application can never end up 'approved' without a Volunteer actually
// having been created.
const RejectApplicationSchema = z.object({
  status: z.literal('rejected'),
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
  const parsed = RejectApplicationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { id } = await params
  const updated = await prisma.volunteerApplication.update({
    where: { id },
    data: { status: 'rejected' },
    select: { id: true, status: true },
  })

  return NextResponse.json(updated)
}
