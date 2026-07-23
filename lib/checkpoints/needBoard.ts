import { prisma } from '@/lib/shared/prisma'

// Explicit priority mapping -- does not rely on SupplyLevel's Postgres enum
// declaration order (urgent, low, enough) happening to match display
// priority. That coincidence held today, but reordering the enum for any
// unrelated schema reason would have silently broken the Need Board's
// sort with no code signal anywhere.
const SUPPLY_LEVEL_PRIORITY: Record<'urgent' | 'low' | 'enough', number> = {
  urgent: 0,
  low: 1,
  enough: 2,
}

export async function getNeedBoard() {
  const rows = await prisma.supplyStatus.findMany({
    select: {
      item: true,
      status: true,
      updated_at: true,
      checkpoint: { select: { id: true, name: true } },
    },
  })

  return rows.sort((a, b) => {
    const priorityDiff = SUPPLY_LEVEL_PRIORITY[a.status] - SUPPLY_LEVEL_PRIORITY[b.status]
    return priorityDiff !== 0 ? priorityDiff : a.updated_at.getTime() - b.updated_at.getTime()
  })
}
