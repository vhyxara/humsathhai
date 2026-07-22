import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/shared/prisma'

// Real bcrypt hash generated per call, never a pasted/hardcoded hash string --
// same discipline as prisma/seed.ts's SEED_PASSWORD. The password itself is
// never asserted on, so a random value is fine.
export async function createTestUser(type: 'admin' | 'volunteer') {
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10)
  return prisma.user.create({
    data: { email: `test-${crypto.randomUUID()}@test.local`, password_hash: passwordHash, type },
  })
}
