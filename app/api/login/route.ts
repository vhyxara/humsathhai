import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createUserSession } from '@/lib/session'

// Precomputed dummy hash so bcrypt.compare always runs, even when no user
// matches the email -- keeps response timing the same for both failure cases
// and avoids leaking account existence through timing.
const DUMMY_HASH = bcrypt.hashSync('no-such-account', 10)

export async function POST(request: Request) {
  const { email, password } = await request.json()

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
