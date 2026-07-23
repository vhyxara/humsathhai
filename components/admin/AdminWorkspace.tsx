'use client'

import { VolunteerCreationForm } from '@/components/admin/VolunteerCreationForm'

// Exists specifically so VolunteerCreationForm is rendered from within
// client-component code, not passed props (including future callback
// props) directly from the server-rendered app/admin/page.tsx -- Next.js
// cannot serialize a function prop across that boundary, which tsc does
// not catch. This wrapper is the fix.
export function AdminWorkspace() {
  return (
    <div className="flex flex-col gap-8">
      <VolunteerCreationForm />
    </div>
  )
}
