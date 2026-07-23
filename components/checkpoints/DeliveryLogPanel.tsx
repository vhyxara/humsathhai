'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { usePendingAction } from '@/lib/shared/usePendingAction'
import { relativeTime } from '@/lib/shared/relativeTime'
import { SUPPLY_ITEMS, type SupplyItem } from '@/lib/checkpoints/supplyItems'

type CheckpointOption = { id: string; name: string }
type DeliveryLogRow = { id: string; item: string; created_at: Date | string; checkpoint: { name: string } }

function DeliveryLogForm({
  checkpoint,
  onLogged,
}: {
  checkpoint: CheckpointOption
  onLogged: (row: DeliveryLogRow) => void
}) {
  const [item, setItem] = useState<SupplyItem>(SUPPLY_ITEMS[0])

  const [submitting, handleSubmit] = usePendingAction(async () => {
    try {
      const response = await fetch('/api/delivery-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpoint_id: checkpoint.id, item }),
      })

      if (!response.ok) {
        toast.error('Failed to log delivery')
        return
      }

      const created: DeliveryLogRow = await response.json()
      onLogged(created)
      toast.success(`${item} logged for ${checkpoint.name}`)
    } catch {
      toast.error('Failed to log delivery')
    }
  })

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="font-medium text-black dark:text-zinc-50">{checkpoint.name}</span>
      <select
        value={item}
        onChange={(event) => setItem(event.target.value as SupplyItem)}
        className="ml-auto rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {SUPPLY_ITEMS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="cursor-pointer rounded-full bg-black px-4 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {submitting ? 'Logging…' : 'Log Delivery'}
      </button>
    </div>
  )
}

function RecentDeliveryLogs({ logs }: { logs: DeliveryLogRow[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No deliveries logged yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <span className="text-black dark:text-zinc-50">{log.item}</span>
          <span className="text-zinc-500 dark:text-zinc-400">{log.checkpoint.name}</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {relativeTime(new Date(log.created_at))}
          </span>
        </li>
      ))}
    </ul>
  )
}

// Rendered alongside RoutedCheckpoints, never replacing it. One small form
// per routed checkpoint; no optimistic update -- the recent-entries list
// only appends the row the server actually returned after a real 201.
export function DeliveryLogPanel({
  checkpoints,
  recentLogs: initialRecentLogs,
}: {
  checkpoints: CheckpointOption[]
  recentLogs: DeliveryLogRow[]
}) {
  const [recentLogs, setRecentLogs] = useState(initialRecentLogs)

  function handleLogged(row: DeliveryLogRow) {
    setRecentLogs((current) => [row, ...current].slice(0, 20))
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Log a Delivery</h2>
        {checkpoints.map((checkpoint) => (
          <DeliveryLogForm key={checkpoint.id} checkpoint={checkpoint} onLogged={handleLogged} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Recent Deliveries</h2>
        <RecentDeliveryLogs logs={recentLogs} />
      </section>
    </div>
  )
}
