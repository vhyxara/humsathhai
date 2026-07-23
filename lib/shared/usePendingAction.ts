'use client'

import { useRef, useState } from 'react'

// Shared manual-pending pattern for onClick/fetch flows that aren't built
// as <form action={...}>, so React 19's useFormStatus/useActionState don't
// apply without restructuring the existing request flow (out of scope).
//
// The `disabled` attribute driven by `pending` state is not itself a
// sufficient double-submit guard: two clicks close enough together can
// both fire before React commits the state update to the DOM. runningRef
// is checked synchronously at the top of run(), before anything async
// happens, so a second near-simultaneous call bails out immediately
// regardless of render timing.
export function usePendingAction<Args extends unknown[]>(action: (...args: Args) => Promise<void>) {
  const [pending, setPending] = useState(false)
  const runningRef = useRef(false)

  async function run(...args: Args) {
    if (runningRef.current) return
    runningRef.current = true
    setPending(true)
    try {
      await action(...args)
    } finally {
      runningRef.current = false
      setPending(false)
    }
  }

  return [pending, run] as const
}
