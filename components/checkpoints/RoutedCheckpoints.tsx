import { relativeTime } from '@/lib/shared/relativeTime'
import { StatusBadge } from '@/components/checkpoints/StatusBadge'

type SupplyStatusRow = {
  id: string
  item: string
  status: 'urgent' | 'low' | 'enough'
  updated_at: Date
}

type CheckpointRow = { id: string; name: string; supplyStatuses: SupplyStatusRow[] }

// Read-only -- no controls of any kind. This renders the same StatusBadge/
// relativeTime primitives SupplyStatusList uses, but never that component
// itself, since SupplyStatusList is interactive (status buttons + a Save
// action wired to PATCH /api/supply-status) and would misleadingly imply
// an Entry Volunteer can edit supply status here.
export function RoutedCheckpoints({ checkpoints }: { checkpoints: CheckpointRow[] }) {
  return (
    <section className="flex flex-col gap-3">
      {checkpoints.map((checkpoint) => (
        <div
          key={checkpoint.id}
          className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <span className="font-medium text-black dark:text-zinc-50">{checkpoint.name}</span>
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
      ))}
    </section>
  )
}
