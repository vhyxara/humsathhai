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

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/shared/prisma'
import { createTestUser } from '@/lib/shared/testHelpers'
import { createUserSession } from '@/lib/auth/session'
import { POST } from './route'

describe('POST /api/admin/volunteers -- authorization', () => {
  let userIds: string[] = []
  let volunteerIds: string[] = []
  let adminIds: string[] = []

  beforeEach(() => {
    cookieStore.clear()
    userIds = []
    volunteerIds = []
    adminIds = []
  })

  afterEach(async () => {
    await prisma.volunteer.deleteMany({ where: { id: { in: volunteerIds } } })
    await prisma.admin.deleteMany({ where: { id: { in: adminIds } } })
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  })

  async function createAdmin(role: 'super' | 'checkpoint') {
    const user = await createTestUser('admin')
    userIds.push(user.id)
    const admin = await prisma.admin.create({
      data: {
        name: `Test ${role} Admin`,
        email: user.email,
        password_hash: user.password_hash,
        role,
        user_id: user.id,
      },
    })
    adminIds.push(admin.id)
    return user
  }

  function buildRequest(body: unknown) {
    return new Request('http://localhost/api/admin/volunteers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  function uniqueBody() {
    return {
      name: 'New Volunteer',
      telegram_handle: `new_volunteer_${crypto.randomUUID()}`,
      role: 'entry' as const,
      email: `create-${crypto.randomUUID()}@test.local`,
    }
  }

  it('rejects an unauthenticated request with 401 and creates no User row', async () => {
    const body = uniqueBody()
    const response = await POST(buildRequest(body))
    expect(response.status).toBe(401)

    const created = await prisma.user.findUnique({ where: { email: body.email } })
    expect(created).toBeNull()
  })

  it('rejects a non-admin volunteer session with 403 and creates no User row', async () => {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    const volunteer = await prisma.volunteer.create({
      data: {
        name: 'Test Volunteer',
        role: 'checkpoint',
        telegram_handle: 'test_vol_authz',
        consent_given: true,
        user_id: user.id,
      },
    })
    volunteerIds.push(volunteer.id)
    await createUserSession(user.id)

    const body = uniqueBody()
    const response = await POST(buildRequest(body))
    expect(response.status).toBe(403)

    const created = await prisma.user.findUnique({ where: { email: body.email } })
    expect(created).toBeNull()
  })

  // Fixture only, for the rejection case -- checkpoint-tier Admin has no
  // active feature gating on it anywhere in this codebase (confirmed during
  // Step 0 recon); this test does not imply it's in scope.
  it('rejects a checkpoint-tier Admin session with 403 and creates no User row', async () => {
    const adminUser = await createAdmin('checkpoint')
    await createUserSession(adminUser.id)

    const body = uniqueBody()
    const response = await POST(buildRequest(body))
    expect(response.status).toBe(403)

    const created = await prisma.user.findUnique({ where: { email: body.email } })
    expect(created).toBeNull()
  })

  it('allows a Super Admin to create a Volunteer: hardcoded type, consent_given false, real bcrypt hash', async () => {
    const adminUser = await createAdmin('super')
    await createUserSession(adminUser.id)

    const body = uniqueBody()
    const response = await POST(buildRequest(body))
    expect(response.status).toBe(201)

    const responseBody = await response.json()
    expect(typeof responseBody.temporary_password).toBe('string')
    expect(responseBody.temporary_password.length).toBeGreaterThan(10)

    const createdUser = await prisma.user.findUnique({ where: { email: body.email } })
    expect(createdUser).not.toBeNull()
    userIds.push(createdUser!.id)
    expect(createdUser!.type).toBe('volunteer')
    expect(createdUser!.password_hash).not.toBe(responseBody.temporary_password)

    const hashMatches = await bcrypt.compare(responseBody.temporary_password, createdUser!.password_hash)
    expect(hashMatches).toBe(true)

    const createdVolunteer = await prisma.volunteer.findUnique({ where: { user_id: createdUser!.id } })
    expect(createdVolunteer).not.toBeNull()
    volunteerIds.push(createdVolunteer!.id)
    expect(createdVolunteer!.consent_given).toBe(false)
    expect(createdVolunteer!.role).toBe('entry')
  })

  it('rejects malformed input with 400 before any account is created', async () => {
    const adminUser = await createAdmin('super')
    await createUserSession(adminUser.id)

    const response = await POST(buildRequest({ name: '', telegram_handle: '', role: 'not-a-role', email: 'not-an-email' }))
    expect(response.status).toBe(400)
  })
})
