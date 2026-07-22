import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/shared/prisma'
import { createUserSession } from '@/lib/auth/session'

// Precomputed dummy hash so bcrypt.compare always runs, even when no user
// matches the email -- keeps response timing the same for both failure cases
// and avoids leaking account existence through timing.
const DUMMY_HASH = bcrypt.hashSync('no-such-account', 10)

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = LoginSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password_hash: true },
  })

  const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH)

  if (!user || !passwordMatches) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await createUserSession(user.id)

  return NextResponse.json({ ok: true })
}
