import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { requireSuperAdmin } from '@/lib/auth/adminAuth'
import {
  getCheckpointsWithSupplyStatuses,
  getVolunteerApplications,
  getVolunteersForAssignment,
  getAssignmentTargets,
} from '@/lib/admin/adminData'
import { AdminWorkspace } from '@/components/admin/AdminWorkspace'

export default async function AdminPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const isSuperAdmin = await requireSuperAdmin(session.id)

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 sm:px-6">
          <p className="text-black dark:text-zinc-50">
            This page is only available to Super Admins.
          </p>
        </main>
      </div>
    )
  }

  const [checkpoints, applications, volunteers, targets] = await Promise.all([
    getCheckpointsWithSupplyStatuses(),
    getVolunteerApplications(),
    getVolunteersForAssignment(),
    getAssignmentTargets(),
  ])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-3xl">
          Admin
        </h1>
        <AdminWorkspace
          statusCheckpoints={checkpoints}
          applications={applications}
          volunteers={volunteers}
          checkpoints={targets.checkpoints}
          entryPoints={targets.entryPoints}
        />
      </main>
    </div>
  )
}
