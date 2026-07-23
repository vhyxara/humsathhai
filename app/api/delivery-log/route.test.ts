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
import { POST } from './route'

describe('POST /api/delivery-log -- authorization', () => {
  let userIds: string[] = []
  let volunteerIds: string[] = []
  let adminIds: string[] = []
  let entryPointIds: string[] = []
  let checkpointIds: string[] = []
  let deliveryLogIds: string[] = []

  beforeEach(() => {
    cookieStore.clear()
    userIds = []
    volunteerIds = []
    adminIds = []
    entryPointIds = []
    checkpointIds = []
    deliveryLogIds = []
  })

  afterEach(async () => {
    await prisma.deliveryLog.deleteMany({ where: { id: { in: deliveryLogIds } } })
    await prisma.volunteer.deleteMany({ where: { id: { in: volunteerIds } } })
    await prisma.admin.deleteMany({ where: { id: { in: adminIds } } })
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.checkpoint.deleteMany({ where: { id: { in: checkpointIds } } })
    await prisma.entryPoint.deleteMany({ where: { id: { in: entryPointIds } } })
  })

  async function createEntryPoint(name: string) {
    const entryPoint = await prisma.entryPoint.create({ data: { name } })
    entryPointIds.push(entryPoint.id)
    return entryPoint
  }

  async function createCheckpoint(name: string, entryPointId: string) {
    const checkpoint = await prisma.checkpoint.create({ data: { name, entry_point_id: entryPointId } })
    checkpointIds.push(checkpoint.id)
    return checkpoint
  }

  async function createEntryVolunteer(entryPointId: string | null) {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    const volunteer = await prisma.volunteer.create({
      data: {
        name: 'Test Entry Volunteer',
        role: 'entry',
        entry_point_id: entryPointId,
        telegram_handle: `test_entry_${crypto.randomUUID()}`,
        consent_given: true,
        user_id: user.id,
      },
    })
    volunteerIds.push(volunteer.id)
    await createUserSession(user.id)
    return { user, volunteer }
  }

  function buildRequest(body: unknown) {
    return new Request('http://localhost/api/delivery-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('rejects an unauthenticated request with 401 and creates no row', async () => {
    const entryPoint = await createEntryPoint('EP')
    const checkpoint = await createCheckpoint('CP', entryPoint.id)

    const response = await POST(buildRequest({ checkpoint_id: checkpoint.id, item: 'Food' }))
    expect(response.status).toBe(401)

    const rows = await prisma.deliveryLog.findMany({ where: { checkpoint_id: checkpoint.id } })
    expect(rows).toHaveLength(0)
  })

  it('rejects a Checkpoint Volunteer session with 403 and creates no row', async () => {
    const entryPoint = await createEntryPoint('EP')
    const checkpoint = await createCheckpoint('CP', entryPoint.id)

    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    const volunteer = await prisma.volunteer.create({
      data: {
        name: 'Test Checkpoint Volunteer',
        role: 'checkpoint',
        telegram_handle: `test_checkpoint_${crypto.randomUUID()}`,
        consent_given: true,
        user_id: user.id,
      },
    })
    volunteerIds.push(volunteer.id)
    await createUserSession(user.id)

    const response = await POST(buildRequest({ checkpoint_id: checkpoint.id, item: 'Food' }))
    expect(response.status).toBe(403)

    const rows = await prisma.deliveryLog.findMany({ where: { checkpoint_id: checkpoint.id } })
    expect(rows).toHaveLength(0)
  })

  it('rejects an Admin session with 403 and creates no row', async () => {
    const entryPoint = await createEntryPoint('EP')
    const checkpoint = await createCheckpoint('CP', entryPoint.id)

    const user = await createTestUser('admin')
    userIds.push(user.id)
    const admin = await prisma.admin.create({
      data: { name: 'Test Admin', email: user.email, password_hash: user.password_hash, role: 'super', user_id: user.id },
    })
    adminIds.push(admin.id)
    await createUserSession(user.id)

    const response = await POST(buildRequest({ checkpoint_id: checkpoint.id, item: 'Food' }))
    expect(response.status).toBe(403)

    const rows = await prisma.deliveryLog.findMany({ where: { checkpoint_id: checkpoint.id } })
    expect(rows).toHaveLength(0)
  })

  it('allows a legitimate Entry Volunteer to log a delivery for their own routed checkpoint', async () => {
    const entryPoint = await createEntryPoint('EP')
    const checkpoint = await createCheckpoint('CP', entryPoint.id)
    const { volunteer } = await createEntryVolunteer(entryPoint.id)

    const response = await POST(buildRequest({ checkpoint_id: checkpoint.id, item: 'Water' }))
    expect(response.status).toBe(201)

    const body = await response.json()
    deliveryLogIds.push(body.id)

    // The response body must be self-sufficient for the client to append
    // directly into the recent-entries list -- checkpoint.name, not just
    // checkpoint_id, must be present (regression coverage for a real bug
    // caught during visual verification: the client crashed reading
    // checkpoint.name off a response that only had checkpoint_id).
    expect(body.checkpoint?.name).toBe('CP')

    const fresh = await prisma.deliveryLog.findUniqueOrThrow({ where: { id: body.id } })
    expect(fresh.checkpoint_id).toBe(checkpoint.id)
    expect(fresh.item).toBe('Water')
    expect(fresh.logged_by).toBe(volunteer.id)
    expect(fresh.created_at).toBeInstanceOf(Date)
  })

  it('CORE TEST: rejects an Entry Volunteer for Entry Point 1 logging against a real checkpoint routed through Entry Point 2, with 403 and no row created', async () => {
    const entryPoint1 = await createEntryPoint('EP1')
    const entryPoint2 = await createEntryPoint('EP2')
    const foreignCheckpoint = await createCheckpoint('EP2 Checkpoint', entryPoint2.id)
    await createEntryVolunteer(entryPoint1.id)

    const response = await POST(buildRequest({ checkpoint_id: foreignCheckpoint.id, item: 'Food' }))
    expect(response.status).toBe(403)

    const rows = await prisma.deliveryLog.findMany({ where: { checkpoint_id: foreignCheckpoint.id } })
    expect(rows).toHaveLength(0)
  })

  it('rejects an invalid item value with 400 and creates no row', async () => {
    const entryPoint = await createEntryPoint('EP')
    const checkpoint = await createCheckpoint('CP', entryPoint.id)
    await createEntryVolunteer(entryPoint.id)

    const response = await POST(buildRequest({ checkpoint_id: checkpoint.id, item: 'Not A Real Item' }))
    expect(response.status).toBe(400)

    const rows = await prisma.deliveryLog.findMany({ where: { checkpoint_id: checkpoint.id } })
    expect(rows).toHaveLength(0)
  })

  it('rejects an unassigned Entry Volunteer (entry_point_id null) with 403 and creates no row', async () => {
    const entryPoint = await createEntryPoint('EP')
    const checkpoint = await createCheckpoint('CP', entryPoint.id)
    await createEntryVolunteer(null)

    const response = await POST(buildRequest({ checkpoint_id: checkpoint.id, item: 'Food' }))
    expect(response.status).toBe(403)

    const rows = await prisma.deliveryLog.findMany({ where: { checkpoint_id: checkpoint.id } })
    expect(rows).toHaveLength(0)
  })
})
