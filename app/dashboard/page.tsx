import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import {
  getCheckpointVolunteerContext,
  getCheckpointSupplyStatuses,
  getEntryVolunteerContext,
  getRoutedCheckpoints,
} from '@/lib/checkpoints/checkpointVolunteer'
import { SupplyStatusList } from '@/components/checkpoints/SupplyStatusList'
import { RoutedCheckpoints } from '@/components/checkpoints/RoutedCheckpoints'

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const checkpointVolunteer = await getCheckpointVolunteerContext(session.id)

  if (checkpointVolunteer?.role === 'checkpoint') {
    const supplyStatuses = checkpointVolunteer.checkpoint_id
      ? await getCheckpointSupplyStatuses(checkpointVolunteer.checkpoint_id)
      : []

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-3xl">
              {checkpointVolunteer.name}&apos;s Checkpoint
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Update supply status for your checkpoint.
            </p>
          </header>

          {!checkpointVolunteer.checkpoint_id ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              You are not currently assigned to a checkpoint.
            </p>
          ) : (
            <SupplyStatusList items={supplyStatuses} />
          )}
        </main>
      </div>
    )
  }

  const entryVolunteer = await getEntryVolunteerContext(session.id)

  if (entryVolunteer?.role === 'entry') {
    const checkpoints = entryVolunteer.entry_point_id
      ? await getRoutedCheckpoints(entryVolunteer.entry_point_id)
      : []

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-3xl">
              {entryVolunteer.name}&apos;s Routed Checkpoints
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Supply status for checkpoints routed through your entry point.
            </p>
          </header>

          {!entryVolunteer.entry_point_id ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              You are not currently assigned to an entry point.
            </p>
          ) : (
            <RoutedCheckpoints checkpoints={checkpoints} />
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
        <p className="text-black dark:text-zinc-50">
          This dashboard is only available to checkpoint or entry volunteers.
        </p>
      </main>
    </div>
  )
}
