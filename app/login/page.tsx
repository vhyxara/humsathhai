'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { usePendingAction } from '@/lib/shared/usePendingAction'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [submitting, submit] = usePendingAction(async (formData: FormData) => {
    setError(null)

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
      }),
    })

    if (!res.ok) {
      setError('Invalid credentials')
      return
    }

    router.push('/dashboard')
    router.refresh()
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(new FormData(event.currentTarget))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 px-4">
        <h1 className="text-xl font-bold text-black dark:text-zinc-50">Log in</h1>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <div className="relative">
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 pr-16 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 cursor-pointer px-3 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-md bg-black px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}
