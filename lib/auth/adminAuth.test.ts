import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/shared/prisma'
import { createTestUser } from '@/lib/shared/testHelpers'
import { requireSuperAdmin } from '@/lib/auth/adminAuth'

describe('requireSuperAdmin', () => {
  let userIds: string[] = []
  let adminIds: string[] = []

  beforeEach(() => {
    userIds = []
    adminIds = []
  })

  afterEach(async () => {
    await prisma.admin.deleteMany({ where: { id: { in: adminIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  })

  it('resolves true for a super Admin', async () => {
    const user = await createTestUser('admin')
    userIds.push(user.id)
    const admin = await prisma.admin.create({
      data: { name: 'Super', email: user.email, password_hash: user.password_hash, role: 'super', user_id: user.id },
    })
    adminIds.push(admin.id)

    await expect(requireSuperAdmin(user.id)).resolves.toBe(true)
  })

  it('resolves false for a checkpoint-tier Admin', async () => {
    const user = await createTestUser('admin')
    userIds.push(user.id)
    const admin = await prisma.admin.create({
      data: { name: 'Checkpoint', email: user.email, password_hash: user.password_hash, role: 'checkpoint', user_id: user.id },
    })
    adminIds.push(admin.id)

    await expect(requireSuperAdmin(user.id)).resolves.toBe(false)
  })

  it('resolves false for a userId with no Admin row at all', async () => {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)

    await expect(requireSuperAdmin(user.id)).resolves.toBe(false)
  })

  it('reflects a role change immediately, proving it reads fresh from the DB rather than a cache', async () => {
    const user = await createTestUser('admin')
    userIds.push(user.id)
    const admin = await prisma.admin.create({
      data: { name: 'Promotable', email: user.email, password_hash: user.password_hash, role: 'checkpoint', user_id: user.id },
    })
    adminIds.push(admin.id)

    await expect(requireSuperAdmin(user.id)).resolves.toBe(false)

    await prisma.admin.update({ where: { id: admin.id }, data: { role: 'super' } })

    await expect(requireSuperAdmin(user.id)).resolves.toBe(true)
  })
})
