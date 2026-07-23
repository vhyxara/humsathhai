import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/shared/prisma'

export type CreateVolunteerInput = {
  name: string
  telegram_handle: string
  role: 'entry' | 'checkpoint'
  email: string
}

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

    return createdVolunteer
  })

  return { volunteer, tempPassword }
}
