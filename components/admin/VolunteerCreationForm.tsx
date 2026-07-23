'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { usePendingAction } from '@/lib/shared/usePendingAction'

function TempPasswordReveal({ name, tempPassword }: { name: string; tempPassword: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950">
      <p className="text-black dark:text-zinc-50">
        Temporary password for {name} (shown once — share it securely, it will not be shown again):
      </p>
      <code className="break-all font-mono text-blue-700 dark:text-blue-300">{tempPassword}</code>
    </div>
  )
}

export function VolunteerCreationForm() {
  const [name, setName] = useState('')
  const [telegramHandle, setTelegramHandle] = useState('')
  const [role, setRole] = useState<'entry' | 'checkpoint'>('entry')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ name: string; tempPassword: string } | null>(null)

  const [submitting, handleSubmit] = usePendingAction(async () => {
    setError(null)
    try {
      const response = await fetch('/api/admin/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          telegram_handle: telegramHandle,
          role,
          email,
        }),
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message = typeof body.error === 'string' ? body.error : 'Failed to create volunteer'
        setError(message)
        toast.error(message)
        return
      }

      setResult({ name: body.volunteer.name, tempPassword: body.temporary_password })
      toast.success(`${body.volunteer.name} created`)
      setName('')
      setTelegramHandle('')
      setEmail('')
      setRole('entry')
    } catch {
      setError('Failed to create volunteer')
      toast.error('Failed to create volunteer')
    }
  })

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Create Volunteer</h2>

      {result && <TempPasswordReveal name={result.name} tempPassword={result.tempPassword} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <input
          type="text"
          placeholder="Telegram handle"
          value={telegramHandle}
          onChange={(event) => setTelegramHandle(event.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as 'entry' | 'checkpoint')}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        >
          <option value="entry">Entry</option>
          <option value="checkpoint">Checkpoint</option>
        </select>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Consent defaults to not given — the volunteer confirms it separately later.
      </p>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !name || !telegramHandle || !email}
        className="cursor-pointer self-start rounded-full bg-black px-4 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {submitting ? 'Creating…' : 'Create Volunteer'}
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  )
}
