import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { requireSuperAdmin } from '@/lib/auth/adminAuth'
import {
  createVolunteerAccount,
  ApplicationNotFoundError,
  ApplicationNotPendingError,
} from '@/lib/admin/createVolunteer'

// Deliberately does NOT accept `type`, an admin `role`, or `consent_given`
// as input fields -- those are hardcoded server-side in
// createVolunteerAccount and must never be settable from a request body.
const CreateVolunteerSchema = z.object({
  name: z.string().min(1),
  telegram_handle: z.string().min(1),
  role: z.enum(['entry', 'checkpoint']),
  email: z.string().email(),
  application_id: z.string().min(1).optional(),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const isSuperAdmin = await requireSuperAdmin(session.id)
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateVolunteerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const { volunteer, tempPassword } = await createVolunteerAccount(parsed.data)

    return NextResponse.json(
      {
        volunteer: { id: volunteer.id, name: volunteer.name, role: volunteer.role },
        temporary_password: tempPassword,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      return NextResponse.json({ error: 'Application not found' }, { status: 400 })
    }
    if (error instanceof ApplicationNotPendingError) {
      return NextResponse.json({ error: 'Application is not pending' }, { status: 400 })
    }
    throw error
  }
}
