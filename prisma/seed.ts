import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const HOUR = 60 * 60 * 1000
// Fake test-only credential, not a real secret. Login: any of the seeded
// emails below with this password.
const SEED_PASSWORD = 'TestPassword123!'

async function main() {
  const entryPoint1 = await prisma.entryPoint.create({
    data: { name: 'Entry Point 1' },
  })
  const entryPoint2 = await prisma.entryPoint.create({
    data: { name: 'Entry Point 2' },
  })

  const pointA = await prisma.checkpoint.create({
    data: { name: 'Point A', entry_point_id: entryPoint1.id },
  })
  const pointB = await prisma.checkpoint.create({
    data: { name: 'Point B', entry_point_id: entryPoint1.id },
  })
  const pointC = await prisma.checkpoint.create({
    data: { name: 'Point C', entry_point_id: entryPoint2.id },
  })
  const pointD = await prisma.checkpoint.create({
    data: { name: 'Point D', entry_point_id: entryPoint2.id },
  })

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)

  const adminUser = await prisma.user.create({
    data: { email: 'admin@example.test', password_hash: passwordHash, type: 'admin' },
  })
  await prisma.admin.create({
    data: {
      name: 'Placeholder Admin',
      email: 'admin@example.test',
      password_hash: passwordHash,
      role: 'super',
      user_id: adminUser.id,
    },
  })

  const volunteer1User = await prisma.user.create({
    data: { email: 'volunteer1@example.test', password_hash: passwordHash, type: 'volunteer' },
  })
  await prisma.volunteer.create({
    data: {
      name: 'Placeholder Volunteer 1',
      role: 'entry',
      entry_point_id: entryPoint1.id,
      telegram_handle: 'placeholder_volunteer_1',
      consent_given: true,
      user_id: volunteer1User.id,
    },
  })

  const volunteer2User = await prisma.user.create({
    data: { email: 'volunteer2@example.test', password_hash: passwordHash, type: 'volunteer' },
  })
  await prisma.volunteer.create({
    data: {
      name: 'Placeholder Volunteer 2',
      role: 'checkpoint',
      checkpoint_id: pointA.id,
      telegram_handle: 'placeholder_volunteer_2',
      consent_given: true,
      user_id: volunteer2User.id,
    },
  })

  const now = Date.now()

  await prisma.supplyStatus.createMany({
    data: [
      { checkpoint_id: pointA.id, item: 'Food', status: 'urgent', updated_at: new Date(now - 12 * 60 * 1000) },
      { checkpoint_id: pointA.id, item: 'Water', status: 'enough', updated_at: new Date(now - 2 * HOUR) },
      { checkpoint_id: pointA.id, item: 'Masks', status: 'low', updated_at: new Date(now - 45 * 60 * 1000) },
      { checkpoint_id: pointB.id, item: 'Masks', status: 'enough', updated_at: new Date(now - 2 * HOUR) },
      { checkpoint_id: pointB.id, item: 'Gloves', status: 'low', updated_at: new Date(now - 3 * HOUR) },
      { checkpoint_id: pointC.id, item: 'Water', status: 'urgent', updated_at: new Date(now - 40 * 60 * 1000) },
      { checkpoint_id: pointC.id, item: 'ORS', status: 'low', updated_at: new Date(now - 90 * 60 * 1000) },
      { checkpoint_id: pointD.id, item: 'Medkit', status: 'low', updated_at: new Date(now - 1 * HOUR) },
      { checkpoint_id: pointD.id, item: 'Blankets', status: 'urgent', updated_at: new Date(now - 5 * HOUR) },
    ],
  })

  console.log('Seed complete.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
