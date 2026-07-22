import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
        <p className="text-black dark:text-zinc-50">
          Logged in as {session.email} ({session.type} / {session.role})
        </p>
        <form action="/api/logout" method="post">
          <button
            type="submit"
            className="text-sm font-semibold text-blue-600 underline dark:text-blue-400"
          >
            Log out
          </button>
        </form>
      </main>
    </div>
  )
}
