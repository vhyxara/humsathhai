import { prisma } from '@/lib/prisma'

const VALID_STATUSES = new Set(['urgent', 'low', 'enough'])

export async function getCheckpointVolunteerContext(userId: string) {
  return prisma.volunteer.findUnique({
    where: { user_id: userId },
    select: { name: true, role: true, checkpoint_id: true },
  })
}

export async function getCheckpointSupplyStatuses(checkpointId: string) {
  return prisma.supplyStatus.findMany({
    where: { checkpoint_id: checkpointId },
    select: { id: true, item: true, status: true, updated_at: true },
  })
}

type AuthorizedUpdate = { ok: true; supplyStatusId: string; status: 'urgent' | 'low' | 'enough' }
type RejectedUpdate = { ok: false; httpStatus: 400 | 403; error: string }

// Independent authorization check for the supply-status mutation. Must be
// called on every mutation attempt, never trusted from a prior page load --
// it re-reads the volunteer and the target row from the DB rather than
// accepting anything the client asserts about either.
export async function authorizeSupplyStatusUpdate(
  userId: string,
  rawSupplyStatusId: unknown,
  rawStatus: unknown
): Promise<AuthorizedUpdate | RejectedUpdate> {
  if (typeof rawSupplyStatusId !== 'string' || typeof rawStatus !== 'string') {
    return { ok: false, httpStatus: 400, error: 'Missing or invalid id/status' }
  }
  if (!VALID_STATUSES.has(rawStatus)) {
    return { ok: false, httpStatus: 400, error: 'Invalid status value' }
  }

  const volunteer = await getCheckpointVolunteerContext(userId)
  if (!volunteer || volunteer.role !== 'checkpoint') {
    return { ok: false, httpStatus: 403, error: 'Not authorized as a checkpoint volunteer' }
  }
  if (!volunteer.checkpoint_id) {
    return { ok: false, httpStatus: 403, error: 'Not currently assigned to a checkpoint' }
  }

  const supplyStatus = await prisma.supplyStatus.findUnique({
    where: { id: rawSupplyStatusId },
    select: { checkpoint_id: true },
  })

  // Same rejection for "not found" and "belongs to another checkpoint" so a
  // failed attempt can't be used to probe which supply-status ids exist.
  if (!supplyStatus || supplyStatus.checkpoint_id !== volunteer.checkpoint_id) {
    return { ok: false, httpStatus: 403, error: 'Not authorized to update this item' }
  }

  return { ok: true, supplyStatusId: rawSupplyStatusId, status: rawStatus as 'urgent' | 'low' | 'enough' }
}
