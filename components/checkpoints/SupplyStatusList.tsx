'use client'

import { useState } from 'react'
import { relativeTime } from '@/lib/shared/relativeTime'
import { StatusBadge } from '@/components/checkpoints/StatusBadge'

type SupplyLevel = 'urgent' | 'low' | 'enough'

type SupplyStatusItem = {
  id: string
  item: string
  status: SupplyLevel
  updated_at: Date | string
}

const STATUS_OPTIONS: SupplyLevel[] = ['enough', 'low', 'urgent']

function SupplyStatusRow({ item }: { item: SupplyStatusItem }) {
  const [current, setCurrent] = useState(item)
  const [selected, setSelected] = useState<SupplyLevel>(item.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = selected !== current.status

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/supply-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, status: selected }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(typeof body.error === 'string' ? body.error : 'Failed to update status')
        return
      }

      const updated: SupplyStatusItem = await response.json()
      setCurrent(updated)
      setSelected(updated.status)
    } catch {
      setError('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold text-black dark:text-zinc-50">{current.item}</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Updated {relativeTime(new Date(current.updated_at))}
          </span>
        </div>
        <StatusBadge status={current.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSelected(option)}
            className={`rounded-full border px-3 py-1 text-sm font-medium capitalize ${
              selected === option
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
            }`}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="ml-auto rounded-full bg-black px-4 py-1 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function SupplyStatusList({ items }: { items: SupplyStatusItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No supply status has been reported for this checkpoint yet.
      </p>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      {items.map((entry) => (
        <SupplyStatusRow key={entry.id} item={entry} />
      ))}
    </section>
  )
}
