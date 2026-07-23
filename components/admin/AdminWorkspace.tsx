'use client'

import { useState } from 'react'
import { StatusMonitoring, type CheckpointRow } from '@/components/admin/StatusMonitoring'
import { VolunteerCreationForm, type CreationPrefill } from '@/components/admin/VolunteerCreationForm'
import { ApplicationsList, type Application } from '@/components/admin/ApplicationsList'
import { AssignmentPanel, type VolunteerRow, type TargetOption } from '@/components/admin/AssignmentPanel'

const TABS = [
  { key: 'status', label: 'Status' },
  { key: 'create', label: 'Create Volunteer' },
  { key: 'applications', label: 'Applications' },
  { key: 'assign', label: 'Assign' },
] as const

type TabKey = (typeof TABS)[number]['key']

function TabBar({ activeTab, onSelect }: { activeTab: TabKey; onSelect: (tab: TabKey) => void }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium ${
            activeTab === tab.key
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function AdminWorkspace({
  statusCheckpoints,
  applications: initialApplications,
  volunteers,
  checkpoints,
  entryPoints,
}: {
  statusCheckpoints: CheckpointRow[]
  applications: Application[]
  volunteers: VolunteerRow[]
  checkpoints: TargetOption[]
  entryPoints: TargetOption[]
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('status')
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
    setActiveTab('create')
  }

  return (
    <div className="flex flex-col gap-6">
      <TabBar activeTab={activeTab} onSelect={setActiveTab} />

      {activeTab === 'status' && <StatusMonitoring checkpoints={statusCheckpoints} />}
      {activeTab === 'create' && <VolunteerCreationForm prefill={prefill} onCreated={handleCreated} />}
      {activeTab === 'applications' && (
        <ApplicationsList applications={applications} onApproveClick={handleApproveClick} onReject={handleReject} />
      )}
      {activeTab === 'assign' && (
        <AssignmentPanel volunteers={volunteers} checkpoints={checkpoints} entryPoints={entryPoints} />
      )}
    </div>
  )
}
