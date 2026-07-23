import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/shared/prisma'

export type CreateVolunteerInput = {
  name: string
  telegram_handle: string
  role: 'entry' | 'checkpoint'
  email: string
  application_id?: string
}

// Thrown (and caught by the route handler) when application_id is present
// but doesn't point at an application eligible to be approved right now --
// keeps both cases a clean 400 instead of an uncaught transaction error, and
// keeps the transaction from ever writing a User/Volunteer for a request
// that can't legitimately mark its linked application approved.
export class ApplicationNotFoundError extends Error {}
export class ApplicationNotPendingError extends Error {}

// Generates and returns the plaintext temporary password exactly once, in
// the return value. Callers must pass it straight through to the one-time
// API response and never log or persist it anywhere else.
//
// User.type and Volunteer.consent_given are hardcoded literals below, never
// read from `input` -- there is no field on CreateVolunteerInput that maps
// to either an admin User.type or an AdminRole, so there is no path from a
// caller-supplied value to a privileged account.
export async function createVolunteerAccount(input: CreateVolunteerInput) {
  const tempPassword = crypto.randomBytes(18).toString('base64url')
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const volunteer = await prisma.$transaction(async (tx) => {
    if (input.application_id) {
      const application = await tx.volunteerApplication.findUnique({
        where: { id: input.application_id },
        select: { status: true },
      })
      if (!application) throw new ApplicationNotFoundError()
      // Refuses to silently re-approve an already-approved application or
      // flip a rejected one back to approved -- an application_id only
      // reaches here via the Approve button's prefill, so a non-pending
      // status means the application was decided elsewhere since the admin
      // loaded the page; fail the whole request rather than guess.
      if (application.status !== 'pending') throw new ApplicationNotPendingError()
    }

    const user = await tx.user.create({
      data: { email: input.email, password_hash: passwordHash, type: 'volunteer' },
    })

    const createdVolunteer = await tx.volunteer.create({
      data: {
        name: input.name,
        telegram_handle: input.telegram_handle,
        role: input.role,
        consent_given: false,
        status: 'active',
        user_id: user.id,
      },
    })

    if (input.application_id) {
      await tx.volunteerApplication.update({
        where: { id: input.application_id },
        data: { status: 'approved' },
      })
    }

    return createdVolunteer
  })

  return { volunteer, tempPassword }
}
