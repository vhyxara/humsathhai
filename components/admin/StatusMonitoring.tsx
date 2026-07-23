import { relativeTime } from '@/lib/shared/relativeTime'
import { StatusBadge } from '@/components/checkpoints/StatusBadge'

// No exact threshold is specified anywhere in this codebase's existing
// patterns -- 4 hours is chosen as a reasonable "someone should check on
// this" signal for a checkpoint whose newest item update is older than that.
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000

type SupplyStatusRow = {
  id: string
  item: string
  status: 'urgent' | 'low' | 'enough'
  updated_at: Date
}

type CheckpointRow = { id: string; name: string; supplyStatuses: SupplyStatusRow[] }

function isStale(supplyStatuses: SupplyStatusRow[]): boolean {
  if (supplyStatuses.length === 0) return false
  const mostRecent = Math.max(...supplyStatuses.map((status) => status.updated_at.getTime()))
  return Date.now() - mostRecent > STALE_THRESHOLD_MS
}

function CheckpointCard({ checkpoint }: { checkpoint: CheckpointRow }) {
  const stale = isStale(checkpoint.supplyStatuses)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-black dark:text-zinc-50">{checkpoint.name}</span>
        {stale && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-300">
            Stale — no update in 4h+
          </span>
        )}
      </div>
      {checkpoint.supplyStatuses.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No supply status reported.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {checkpoint.supplyStatuses.map((status) => (
            <li key={status.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">{status.item}</span>
              <span className="flex items-center gap-2">
                <StatusBadge status={status.status} />
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {relativeTime(status.updated_at)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StatusMonitoring({ checkpoints }: { checkpoints: CheckpointRow[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Checkpoint Status</h2>
      {checkpoints.map((checkpoint) => (
        <CheckpointCard key={checkpoint.id} checkpoint={checkpoint} />
      ))}
    </section>
  )
}
