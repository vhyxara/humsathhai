import Link from 'next/link'
import { getSession } from '@/lib/auth/session'

// Server Component -- calls getSession() directly rather than fetching
// after mount. The logout control is a plain form POST (no client
// interactivity needed), so no client-component split is required here.
export async function Nav() {
  const session = await getSession()

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-semibold text-black dark:text-zinc-50">
          DemocracySaviour
        </Link>

        {session ? (
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Dashboard
            </Link>
            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="cursor-pointer text-sm font-semibold text-blue-600 underline dark:text-blue-400"
              >
                Log out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  )
}
