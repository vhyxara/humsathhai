import { prisma } from '@/lib/prisma'
import { relativeTime } from '@/lib/relativeTime'

const STATUS_STYLES = {
  urgent: { label: 'Urgent', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800' },
  low: { label: 'Low', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800' },
  enough: { label: 'Enough', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800' },
} as const

async function getNeedBoard() {
  return prisma.supplyStatus.findMany({
    select: {
      item: true,
      status: true,
      updated_at: true,
      checkpoint: { select: { name: true } },
    },
    // Postgres orders native enums by declaration order (urgent, low, enough),
    // so this ordering already puts the most urgent items first.
    orderBy: [{ status: 'asc' }, { updated_at: 'asc' }],
  })
}

export default async function Home() {
  const needBoard = await getNeedBoard()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-3 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-3xl">
            Support Students with Essential Supplies
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Help deliver food, water, medicines, and other essentials where they are
            needed most. Every contribution reaches a volunteer coordinating supplies
            on the ground.
          </p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">
            #HumAapkeSaathHai
          </p>
        </header>

        <section className="flex flex-col gap-3">
          {needBoard.map((entry) => {
            const style = STATUS_STYLES[entry.status]
            return (
              <div
                key={`${entry.checkpoint.name}-${entry.item}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {entry.checkpoint.name}
                  </span>
                  <span className="text-lg font-semibold text-black dark:text-zinc-50">
                    {entry.item}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Updated {relativeTime(entry.updated_at)}
                  </span>
                </div>
                <span
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${style.badge}`}
                >
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  {style.label}
                </span>
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}
