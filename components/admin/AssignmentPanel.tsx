'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { usePendingAction } from '@/lib/shared/usePendingAction'

export type VolunteerRow = {
  id: string
  name: string
  role: 'entry' | 'checkpoint'
  checkpoint_id: string | null
  entry_point_id: string | null
}

export type TargetOption = { id: string; name: string }

export function AssignmentPanel({
  volunteers,
  checkpoints,
  entryPoints,
}: {
  volunteers: VolunteerRow[]
  checkpoints: TargetOption[]
  entryPoints: TargetOption[]
}) {
  const [volunteerId, setVolunteerId] = useState('')
  const [targetId, setTargetId] = useState('')

  const selectedVolunteer = useMemo(
    () => volunteers.find((volunteer) => volunteer.id === volunteerId) ?? null,
    [volunteers, volunteerId]
  )
  const options = selectedVolunteer?.role === 'checkpoint' ? checkpoints : entryPoints

  const [submitting, handleAssign] = usePendingAction(async () => {
    if (!selectedVolunteer || !targetId) return
    try {
      const response = await fetch(`/api/admin/volunteers/${selectedVolunteer.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: targetId }),
      })

      if (!response.ok) {
        toast.error('Failed to assign volunteer')
        return
      }

      toast.success(`${selectedVolunteer.name} assigned`)
      setTargetId('')
    } catch {
      toast.error('Failed to assign volunteer')
    }
  })

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Assign Volunteer</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          value={volunteerId}
          onChange={(event) => {
            setVolunteerId(event.target.value)
            setTargetId('')
          }}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        >
          <option value="">Select volunteer…</option>
          {volunteers.map((volunteer) => (
            <option key={volunteer.id} value={volunteer.id}>
              {volunteer.name} ({volunteer.role})
            </option>
          ))}
        </select>
        <select
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          disabled={!selectedVolunteer}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        >
          <option value="">
            {selectedVolunteer?.role === 'checkpoint' ? 'Select checkpoint…' : 'Select entry point…'}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAssign}
          disabled={!selectedVolunteer || !targetId || submitting}
          className="cursor-pointer rounded-full bg-black px-4 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
        >
          {submitting ? 'Assigning…' : 'Assign'}
        </button>
      </div>
    </section>
  )
}
