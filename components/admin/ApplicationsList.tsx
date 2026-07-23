'use client'

import { toast } from 'sonner'
import { usePendingAction } from '@/lib/shared/usePendingAction'

export type Application = {
  id: string
  name: string
  telegram_handle: string
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: Date | string
}

function ApplicationRow({
  application,
  onApproveClick,
  onReject,
}: {
  application: Application
  onApproveClick: (application: Application) => void
  onReject: (id: string) => void
}) {
  const [rejecting, handleReject] = usePendingAction(async () => {
    try {
      const response = await fetch(`/api/admin/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })

      if (!response.ok) {
        toast.error('Failed to reject application')
        return
      }

      onReject(application.id)
      toast.success(`${application.name} rejected`)
    } catch {
      toast.error('Failed to reject application')
    }
  })

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-black dark:text-zinc-50">{application.name}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">@{application.telegram_handle}</span>
        <span className="text-xs capitalize text-zinc-400 dark:text-zinc-500">{application.status}</span>
      </div>
      {application.status === 'pending' && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onApproveClick(application)}
            className="cursor-pointer rounded-full bg-black px-3 py-1 text-sm font-semibold text-white dark:bg-white dark:text-black"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={rejecting}
            className="cursor-pointer rounded-full border border-zinc-300 px-3 py-1 text-sm font-semibold text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
          >
            {rejecting ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      )}
    </div>
  )
}

function ProcessedApplicationRow({ application }: { application: Application }) {
  const statusStyle =
    application.status === 'approved'
      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-zinc-600 dark:text-zinc-400">{application.name}</span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">@{application.telegram_handle}</span>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle}`}>
        {application.status}
      </span>
    </div>
  )
}

export function ApplicationsList({
  applications,
  onApproveClick,
  onReject,
}: {
  applications: Application[]
  onApproveClick: (application: Application) => void
  onReject: (id: string) => void
}) {
  const pending = applications.filter((application) => application.status === 'pending')
  const processed = applications.filter((application) => application.status !== 'pending')

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Volunteer Applications</h2>
      {pending.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No pending applications.</p>
      ) : (
        pending.map((application) => (
          <ApplicationRow
            key={application.id}
            application={application}
            onApproveClick={onApproveClick}
            onReject={onReject}
          />
        ))
      )}

      {processed.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Processed</h3>
          {processed.map((application) => (
            <ProcessedApplicationRow key={application.id} application={application} />
          ))}
        </div>
      )}
    </section>
  )
}
