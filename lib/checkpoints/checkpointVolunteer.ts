import { prisma } from '@/lib/shared/prisma'

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

// Independent of getCheckpointVolunteerContext -- that function is also
// used by authorizeSupplyStatusUpdate, so it stays untouched. This reads
// the same Volunteer row fresh from the DB, selecting entry_point_id
// instead of checkpoint_id, for the Entry Volunteer's own dashboard branch.
export async function getEntryVolunteerContext(userId: string) {
  return prisma.volunteer.findUnique({
    where: { user_id: userId },
    select: { name: true, role: true, entry_point_id: true },
  })
}

export async function getRoutedCheckpoints(entryPointId: string) {
  return prisma.checkpoint.findMany({
    where: { entry_point_id: entryPointId },
    select: {
      id: true,
      name: true,
      supplyStatuses: { select: { id: true, item: true, status: true, updated_at: true } },
    },
  })
}

// Resolves logged_by from userId itself, via its own independent lookup --
// getEntryVolunteerContext doesn't select the Volunteer's own id (only
// name/role/entry_point_id) and stays untouched, so this is a second,
// self-contained fresh read rather than an extension of that function.
// Never accepts logged_by from a caller; it is always server-derived here.
export async function createDeliveryLog(userId: string, checkpointId: string, item: string) {
  const volunteer = await prisma.volunteer.findUniqueOrThrow({
    where: { user_id: userId },
    select: { id: true },
  })

  return prisma.deliveryLog.create({
    data: { checkpoint_id: checkpointId, item, logged_by: volunteer.id },
    // Includes checkpoint.name (not just checkpoint_id) so the response
    // shape exactly matches getRecentDeliveryLogs's rows -- the client
    // appends this row directly into the recent-entries list, and it must
    // be self-sufficient rather than requiring the client to stitch in
    // data it happens to already know from elsewhere.
    select: {
      id: true,
      checkpoint_id: true,
      item: true,
      logged_by: true,
      created_at: true,
      checkpoint: { select: { name: true } },
    },
  })
}

// Scoped the same way as getRoutedCheckpoints -- via the checkpoint's
// entry_point_id, never via anything client-supplied. No volunteer
// contact data selected, matching the read-only dashboard's own
// select-scoping discipline.
export async function getRecentDeliveryLogs(entryPointId: string) {
  return prisma.deliveryLog.findMany({
    where: { checkpoint: { entry_point_id: entryPointId } },
    select: {
      id: true,
      item: true,
      created_at: true,
      checkpoint: { select: { name: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 20,
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
