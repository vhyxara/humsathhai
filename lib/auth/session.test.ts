import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory cookie jar standing in for next/headers' cookies(), which
// throws outside a real Next.js request scope (confirmed empirically during
// Step 0 recon). This mocks ONLY the cookie mechanics -- DB access below
// still goes through the real Prisma client against the isolated test DB.
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
import { createUserSession, destroySession, getSession, SESSION_COOKIE } from '@/lib/auth/session'

describe('session lifecycle', () => {
  let userIds: string[] = []

  beforeEach(() => {
    cookieStore.clear()
    userIds = []
  })

  afterEach(async () => {
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.volunteer.deleteMany({ where: { user_id: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  })

  it('createUserSession creates a Session row with correct userId and a future expires', async () => {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    const before = new Date()

    await createUserSession(user.id)

    const token = cookieStore.get(SESSION_COOKIE)
    expect(token).toBeDefined()

    const sessionRow = await prisma.session.findUnique({ where: { sessionToken: token! } })
    expect(sessionRow).not.toBeNull()
    expect(sessionRow!.userId).toBe(user.id)
    expect(sessionRow!.expires.getTime()).toBeGreaterThan(before.getTime())
  })

  it('getSession resolves the correct associated Volunteer profile for a valid session token', async () => {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    const volunteer = await prisma.volunteer.create({
      data: {
        name: 'Session Test Volunteer',
        role: 'checkpoint',
        telegram_handle: 'session_test',
        consent_given: true,
        user_id: user.id,
      },
    })

    await createUserSession(user.id)
    const session = await getSession()

    expect(session).not.toBeNull()
    expect(session!.id).toBe(user.id)
    expect(session!.email).toBe(user.email)
    expect(session!.type).toBe('volunteer')
    expect(session!.name).toBe(volunteer.name)
    expect(session!.role).toBe('checkpoint')
  })

  it('destroySession deletes the Session row', async () => {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    await createUserSession(user.id)
    const token = cookieStore.get(SESSION_COOKIE)!

    await destroySession()

    const sessionRow = await prisma.session.findUnique({ where: { sessionToken: token } })
    expect(sessionRow).toBeNull()
  })

  it('getSession resolves to null for a nonexistent session token, not an error', async () => {
    cookieStore.set(SESSION_COOKIE, 'this-token-does-not-exist')

    await expect(getSession()).resolves.toBeNull()
  })

  it('getSession resolves to null for an expired session token, not an error', async () => {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    await prisma.volunteer.create({
      data: {
        name: 'Expired Session Volunteer',
        role: 'checkpoint',
        telegram_handle: 'expired_test',
        consent_given: true,
        user_id: user.id,
      },
    })
    const expiredToken = crypto.randomUUID()
    await prisma.session.create({
      data: { sessionToken: expiredToken, userId: user.id, expires: new Date(Date.now() - 1000) },
    })
    cookieStore.set(SESSION_COOKIE, expiredToken)

    await expect(getSession()).resolves.toBeNull()
  })
})
