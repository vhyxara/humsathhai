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

describe('PATCH /api/admin/applications/[id] -- authorization', () => {
  let userIds: string[] = []
  let adminIds: string[] = []
  let applicationIds: string[] = []

  beforeEach(() => {
    cookieStore.clear()
    userIds = []
    adminIds = []
    applicationIds = []
  })

  afterEach(async () => {
    await prisma.admin.deleteMany({ where: { id: { in: adminIds } } })
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.volunteerApplication.deleteMany({ where: { id: { in: applicationIds } } })
  })

  async function createApplication() {
    const application = await prisma.volunteerApplication.create({
      data: { name: 'Applicant', telegram_handle: `applicant_${crypto.randomUUID()}`, status: 'pending' },
    })
    applicationIds.push(application.id)
    return application
  }

  function buildRequest(id: string, body: unknown) {
    return new Request(`http://localhost/api/admin/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('rejects an unauthenticated request with 401 and leaves status unchanged', async () => {
    const application = await createApplication()
    const response = await PATCH(buildRequest(application.id, { status: 'rejected' }), {
      params: Promise.resolve({ id: application.id }),
    })
    expect(response.status).toBe(401)

    const fresh = await prisma.volunteerApplication.findUniqueOrThrow({ where: { id: application.id } })
    expect(fresh.status).toBe('pending')
  })

  it('rejects a non-super-admin session with 403 and leaves status unchanged', async () => {
    const user = await createTestUser('admin')
    userIds.push(user.id)
    const admin = await prisma.admin.create({
      data: { name: 'Checkpoint Admin', email: user.email, password_hash: user.password_hash, role: 'checkpoint', user_id: user.id },
    })
    adminIds.push(admin.id)
    await createUserSession(user.id)

    const application = await createApplication()
    const response = await PATCH(buildRequest(application.id, { status: 'rejected' }), {
      params: Promise.resolve({ id: application.id }),
    })
    expect(response.status).toBe(403)

    const fresh = await prisma.volunteerApplication.findUniqueOrThrow({ where: { id: application.id } })
    expect(fresh.status).toBe('pending')
  })

  it('allows a Super Admin to reject an application', async () => {
    const user = await createTestUser('admin')
    userIds.push(user.id)
    const admin = await prisma.admin.create({
      data: { name: 'Super Admin', email: user.email, password_hash: user.password_hash, role: 'super', user_id: user.id },
    })
    adminIds.push(admin.id)
    await createUserSession(user.id)

    const application = await createApplication()
    const response = await PATCH(buildRequest(application.id, { status: 'rejected' }), {
      params: Promise.resolve({ id: application.id }),
    })
    expect(response.status).toBe(200)

    const fresh = await prisma.volunteerApplication.findUniqueOrThrow({ where: { id: application.id } })
    expect(fresh.status).toBe('rejected')
  })

  it('rejects a request that tries to set status to approved directly, with 400', async () => {
    const user = await createTestUser('admin')
    userIds.push(user.id)
    const admin = await prisma.admin.create({
      data: { name: 'Super Admin', email: user.email, password_hash: user.password_hash, role: 'super', user_id: user.id },
    })
    adminIds.push(admin.id)
    await createUserSession(user.id)

    const application = await createApplication()
    const response = await PATCH(buildRequest(application.id, { status: 'approved' }), {
      params: Promise.resolve({ id: application.id }),
    })
    expect(response.status).toBe(400)

    const fresh = await prisma.volunteerApplication.findUniqueOrThrow({ where: { id: application.id } })
    expect(fresh.status).toBe('pending')
  })
})
