import { notFound } from 'next/navigation'
import { prisma } from '@/lib/shared/prisma'
import { relativeTime } from '@/lib/shared/relativeTime'
import { StatusBadge } from '@/components/checkpoints/StatusBadge'

async function getCheckpointDetail(id: string) {
  return prisma.checkpoint.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      supplyStatuses: { select: { item: true, status: true, updated_at: true } },
      entryPoint: {
        select: {
          name: true,
          volunteer: { select: { telegram_handle: true, consent_given: true } },
        },
      },
    },
  })
}

export default async function CheckpointPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const checkpoint = await getCheckpointDetail(id)

  if (!checkpoint) {
    notFound()
  }

  const { entryPoint } = checkpoint
  const volunteer = entryPoint?.volunteer
  const isContactAvailable = volunteer?.consent_given === true

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-2 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-3xl">
            {checkpoint.name}
          </h1>
        </header>

        <section className="flex flex-col gap-3">
          {checkpoint.supplyStatuses.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No supply status has been reported for this checkpoint yet.
            </p>
          ) : (
            checkpoint.supplyStatuses.map((entry) => (
              <div
                key={entry.item}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-black dark:text-zinc-50">
                    {entry.item}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Updated {relativeTime(entry.updated_at)}
                  </span>
                </div>
                <StatusBadge status={entry.status} />
              </div>
            ))
          )}
        </section>

        {entryPoint && (
          <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Hand over to the Entry Volunteer at {entryPoint.name}. They&apos;ll route it to{' '}
              {checkpoint.name}.
            </p>
            {isContactAvailable ? (
              <a
                href={`https://t.me/${volunteer!.telegram_handle}`}
                className="text-sm font-semibold text-blue-600 underline dark:text-blue-400"
              >
                Message on Telegram
              </a>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Delivery contact not yet available.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
