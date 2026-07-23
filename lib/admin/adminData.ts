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
