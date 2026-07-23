import { prisma } from '@/lib/shared/prisma'

export async function getCheckpointsWithSupplyStatuses() {
  return prisma.checkpoint.findMany({
    select: {
      id: true,
      name: true,
      supplyStatuses: { select: { id: true, item: true, status: true, updated_at: true } },
    },
  })
}

export async function getVolunteerApplications() {
  return prisma.volunteerApplication.findMany({
    orderBy: { submitted_at: 'desc' },
    select: {
      id: true,
      name: true,
      telegram_handle: true,
      message: true,
      status: true,
      submitted_at: true,
    },
  })
}

export async function getVolunteersForAssignment() {
  return prisma.volunteer.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true, checkpoint_id: true, entry_point_id: true },
  })
}

export async function getAssignmentTargets() {
  const [checkpoints, entryPoints] = await Promise.all([
    prisma.checkpoint.findMany({ select: { id: true, name: true } }),
    prisma.entryPoint.findMany({ select: { id: true, name: true } }),
  ])
  return { checkpoints, entryPoints }
}
