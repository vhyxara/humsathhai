import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { cookieStore } = vi.hoisted(() => ({ cookieStore: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name)
      return value === undefined ? undefined : { name, value }
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, value)
    },
    delete: (name: string) => {
      cookieStore.delete(name)
    },
  }),
}))

import { prisma } from '@/lib/shared/prisma'
import { createTestUser } from '@/lib/shared/testHelpers'
import { createUserSession } from '@/lib/auth/session'
import { PATCH } from './route'

describe('PATCH /api/admin/volunteers/[id]/assign -- authorization', () => {
  let userIds: string[] = []
  let adminIds: string[] = []
  let volunteerIds: string[] = []
  let checkpointIds: string[] = []

  beforeEach(() => {
    cookieStore.clear()
    userIds = []
    adminIds = []
    volunteerIds = []
    checkpointIds = []
  })

  afterEach(async () => {
    await prisma.admin.deleteMany({ where: { id: { in: adminIds } } })
    await prisma.volunteer.deleteMany({ where: { id: { in: volunteerIds } } })
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.checkpoint.deleteMany({ where: { id: { in: checkpointIds } } })
  })

  async function createCheckpointVolunteer() {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    const volunteer = await prisma.volunteer.create({
      data: {
        name: 'Assignable Volunteer',
        role: 'checkpoint',
        telegram_handle: `assignable_${crypto.randomUUID()}`,
        consent_given: true,
        user_id: user.id,
      },
    })
    volunteerIds.push(volunteer.id)
    return volunteer
  }

  async function createCheckpoint() {
    const checkpoint = await prisma.checkpoint.create({ data: { name: `Checkpoint ${crypto.randomUUID()}` } })
    checkpointIds.push(checkpoint.id)
    return checkpoint
  }

  function buildRequest(id: string, body: unknown) {
    return new Request(`http://localhost/api/admin/volunteers/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('rejects an unauthenticated request with 401 and leaves the volunteer unassigned', async () => {
    const volunteer = await createCheckpointVolunteer()
    const checkpoint = await createCheckpoint()

    const response = await PATCH(buildRequest(volunteer.id, { target_id: checkpoint.id }), {
      params: Promise.resolve({ id: volunteer.id }),
    })
    expect(response.status).toBe(401)

    const fresh = await prisma.volunteer.findUniqueOrThrow({ where: { id: volunteer.id } })
    expect(fresh.checkpoint_id).toBeNull()
  })

  it('rejects a non-super-admin session with 403 and leaves the volunteer unassigned', async () => {
    const adminUserRow = await createTestUser('admin')
    userIds.push(adminUserRow.id)
    const admin = await prisma.admin.create({
      data: {
        name: 'Checkpoint Admin',
        email: adminUserRow.email,
        password_hash: adminUserRow.password_hash,
        role: 'checkpoint',
        user_id: adminUserRow.id,
      },
    })
    adminIds.push(admin.id)
    await createUserSession(adminUserRow.id)

    const volunteer = await createCheckpointVolunteer()
    const checkpoint = await createCheckpoint()

    const response = await PATCH(buildRequest(volunteer.id, { target_id: checkpoint.id }), {
      params: Promise.resolve({ id: volunteer.id }),
    })
    expect(response.status).toBe(403)

    const fresh = await prisma.volunteer.findUniqueOrThrow({ where: { id: volunteer.id } })
    expect(fresh.checkpoint_id).toBeNull()
  })

  it('allows a Super Admin to assign a checkpoint-role Volunteer to an existing Checkpoint', async () => {
    const adminUserRow = await createTestUser('admin')
    userIds.push(adminUserRow.id)
    const admin = await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: adminUserRow.email,
        password_hash: adminUserRow.password_hash,
        role: 'super',
        user_id: adminUserRow.id,
      },
    })
    adminIds.push(admin.id)
    await createUserSession(adminUserRow.id)

    const volunteer = await createCheckpointVolunteer()
    const checkpoint = await createCheckpoint()

    const response = await PATCH(buildRequest(volunteer.id, { target_id: checkpoint.id }), {
      params: Promise.resolve({ id: volunteer.id }),
    })
    expect(response.status).toBe(200)

    const fresh = await prisma.volunteer.findUniqueOrThrow({ where: { id: volunteer.id } })
    expect(fresh.checkpoint_id).toBe(checkpoint.id)
  })

  it('rejects assignment to a nonexistent Checkpoint id with 400', async () => {
    const adminUserRow = await createTestUser('admin')
    userIds.push(adminUserRow.id)
    const admin = await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: adminUserRow.email,
        password_hash: adminUserRow.password_hash,
        role: 'super',
        user_id: adminUserRow.id,
      },
    })
    adminIds.push(admin.id)
    await createUserSession(adminUserRow.id)

    const volunteer = await createCheckpointVolunteer()

    const response = await PATCH(buildRequest(volunteer.id, { target_id: 'does-not-exist' }), {
      params: Promise.resolve({ id: volunteer.id }),
    })
    expect(response.status).toBe(400)
  })
})
