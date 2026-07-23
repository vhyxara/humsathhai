import { prisma } from '@/lib/shared/prisma'

export async function getCheckpointDetail(id: string) {
  return prisma.checkpoint.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      supplyStatuses: { select: { item: true, status: true, updated_at: true } },
      entryPoint: {
        select: {
          name: true,
          volunteer: { select: { telegram_handle: true, consent_given: true } },
        },
      },
    },
  })
}
