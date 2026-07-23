'use client'

import { useState } from 'react'
import { VolunteerCreationForm, type CreationPrefill } from '@/components/admin/VolunteerCreationForm'
import { ApplicationsList, type Application } from '@/components/admin/ApplicationsList'
import { AssignmentPanel, type VolunteerRow, type TargetOption } from '@/components/admin/AssignmentPanel'

export function AdminWorkspace({
  applications: initialApplications,
  volunteers,
  checkpoints,
  entryPoints,
}: {
  applications: Application[]
  volunteers: VolunteerRow[]
  checkpoints: TargetOption[]
  entryPoints: TargetOption[]
}) {
  const [applications, setApplications] = useState(initialApplications)
  const [prefill, setPrefill] = useState<CreationPrefill>(null)

  function handleCreated(applicationId: string) {
    setApplications((current) =>
      current.map((application) =>
        application.id === applicationId ? { ...application, status: 'approved' } : application
      )
    )
    setPrefill(null)
  }

  function handleReject(applicationId: string) {
    setApplications((current) =>
      current.map((application) =>
        application.id === applicationId ? { ...application, status: 'rejected' } : application
      )
    )
  }

  function handleApproveClick(application: Application) {
    setPrefill({ name: application.name, telegram_handle: application.telegram_handle, applicationId: application.id })
  }

  return (
    <div className="flex flex-col gap-8">
      <VolunteerCreationForm prefill={prefill} onCreated={handleCreated} />
      <ApplicationsList applications={applications} onApproveClick={handleApproveClick} onReject={handleReject} />
      <AssignmentPanel volunteers={volunteers} checkpoints={checkpoints} entryPoints={entryPoints} />
    </div>
  )
}
