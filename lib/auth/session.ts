import { cache } from 'react'
import { cookies } from 'next/headers'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/shared/prisma'

// Auth.js hard-rejects session.strategy: "database" whenever every configured
// provider is Credentials-only (@auth/core/lib/utils/assert.js throws
// UnsupportedStrategy, and @auth/core/index.js turns that into a 500 on every
// request) -- there is no supported way to combine a Credentials-only setup
// with Auth.js's built-in database session strategy. This module manages
// Session rows directly, via the same Prisma adapter functions Auth.js would
// use internally, instead of going through NextAuth's session pipeline.

const authAdapter = PrismaAdapter(prisma)

export const SESSION_COOKIE = 'session_token'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export async function createUserSession(userId: string) {
  const sessionToken = crypto.randomUUID()
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  // PrismaAdapter always implements createSession/deleteSession -- the Adapter
  // interface just marks them optional since not every adapter does.
  await authAdapter.createSession!({ sessionToken, userId, expires })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    path: '/',
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    await authAdapter.deleteSession!(token)
  }

  cookieStore.delete(SESSION_COOKIE)
}

// Wrapped in React's cache() so multiple call sites within the same render
// pass (e.g. the shared Nav and a page's own authorization check) share one
// DB lookup instead of each issuing their own.
export const getSession = cache(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    select: {
      expires: true,
      user: {
        select: {
          id: true,
          email: true,
          type: true,
          admin: { select: { name: true, role: true } },
          volunteer: { select: { name: true, role: true } },
        },
      },
    },
  })

  if (!session || session.expires < new Date()) return null

  const profile = session.user.type === 'admin' ? session.user.admin : session.user.volunteer
  if (!profile) return null

  return {
    id: session.user.id,
    email: session.user.email,
    type: session.user.type,
    name: profile.name,
    role: profile.role,
  }
})
