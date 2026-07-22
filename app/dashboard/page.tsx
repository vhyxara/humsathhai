import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getCheckpointVolunteerContext, getCheckpointSupplyStatuses } from '@/lib/checkpoints/checkpointVolunteer'
import { SupplyStatusList } from '@/components/checkpoints/SupplyStatusList'

function LogoutForm() {
  return (
    <form action="/api/logout" method="post">
      <button
        type="submit"
        className="text-sm font-semibold text-blue-600 underline dark:text-blue-400"
      >
        Log out
      </button>
    </form>
  )
}

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const volunteer = await getCheckpointVolunteerContext(session.id)

  if (!volunteer || volunteer.role !== 'checkpoint') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
          <p className="text-black dark:text-zinc-50">
            This dashboard is only available to checkpoint volunteers.
          </p>
          <LogoutForm />
        </main>
      </div>
    )
  }

  const supplyStatuses = volunteer.checkpoint_id
    ? await getCheckpointSupplyStatuses(volunteer.checkpoint_id)
    : []

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-3xl">
            {volunteer.name}&apos;s Checkpoint
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Update supply status for your checkpoint.
          </p>
        </header>

        {!volunteer.checkpoint_id ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You are not currently assigned to a checkpoint.
          </p>
        ) : (
          <SupplyStatusList items={supplyStatuses} />
        )}

        <LogoutForm />
      </main>
    </div>
  )
}
