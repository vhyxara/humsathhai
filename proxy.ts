import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'

// Authentication only: "is there a valid session." Role and checkpoint-
// ownership checks stay in the page component and the mutation route,
// where they already are -- this must not grow into an authorization check.
export async function proxy(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/admin'],
}
