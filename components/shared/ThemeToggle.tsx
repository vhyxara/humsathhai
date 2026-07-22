'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

// Client island: useTheme() is a hook, so this one piece of Nav can't stay
// a Server Component. Everything else in Nav (session display, links, the
// logout form) has no such requirement and stays server-rendered.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // resolvedTheme is unknown until after mount (it depends on localStorage /
  // system preference read client-side) -- render a fixed-width placeholder
  // rather than guessing, to avoid a hydration mismatch.
  if (!mounted) {
    return <span className="inline-block w-9" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="cursor-pointer text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
    >
      {isDark ? 'Light' : 'Dark'}
    </button>
  )
}
