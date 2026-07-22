import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/shared/prisma'
import { createTestUser } from '@/lib/shared/testHelpers'
import { authorizeSupplyStatusUpdate } from '@/lib/checkpoints/checkpointVolunteer'

describe('authorizeSupplyStatusUpdate', () => {
  let checkpointIds: string[] = []
  let volunteerIds: string[] = []
  let userIds: string[] = []
  let supplyStatusIds: string[] = []

  beforeEach(() => {
    checkpointIds = []
    volunteerIds = []
    userIds = []
    supplyStatusIds = []
  })

  afterEach(async () => {
    await prisma.supplyStatus.deleteMany({ where: { id: { in: supplyStatusIds } } })
    await prisma.volunteer.deleteMany({ where: { id: { in: volunteerIds } } })
    await prisma.checkpoint.deleteMany({ where: { id: { in: checkpointIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  })

  async function createCheckpoint(name: string) {
    const checkpoint = await prisma.checkpoint.create({ data: { name } })
    checkpointIds.push(checkpoint.id)
    return checkpoint
  }

  async function createCheckpointVolunteer(checkpointId: string | null) {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    const volunteer = await prisma.volunteer.create({
      data: {
        name: 'Test Checkpoint Volunteer',
        role: 'checkpoint',
        checkpoint_id: checkpointId,
        telegram_handle: 'test_handle',
        consent_given: true,
        user_id: user.id,
      },
    })
    volunteerIds.push(volunteer.id)
    return volunteer
  }

  async function createSupplyStatus(checkpointId: string, item: string, status: 'urgent' | 'low' | 'enough') {
    const row = await prisma.supplyStatus.create({ data: { checkpoint_id: checkpointId, item, status } })
    supplyStatusIds.push(row.id)
    return row
  }

  it('allows a checkpoint volunteer to update a SupplyStatus row on their own checkpoint', async () => {
    const checkpoint = await createCheckpoint('Own Checkpoint')
    const volunteer = await createCheckpointVolunteer(checkpoint.id)
    const supplyStatus = await createSupplyStatus(checkpoint.id, 'Food', 'urgent')

    const result = await authorizeSupplyStatusUpdate(volunteer.user_id, supplyStatus.id, 'enough')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected authorization to succeed')

    await prisma.supplyStatus.update({
      where: { id: result.supplyStatusId },
      data: { status: result.status },
    })

    const fresh = await prisma.supplyStatus.findUniqueOrThrow({ where: { id: supplyStatus.id } })
    expect(fresh.status).toBe('enough')
    expect(fresh.updated_at.getTime()).toBeGreaterThan(supplyStatus.updated_at.getTime())
  })

  it('rejects an update to a SupplyStatus row belonging to a different checkpoint', async () => {
    const ownCheckpoint = await createCheckpoint('Own Checkpoint')
    const otherCheckpoint = await createCheckpoint('Other Checkpoint')
    const volunteer = await createCheckpointVolunteer(ownCheckpoint.id)
    const otherSupplyStatus = await createSupplyStatus(otherCheckpoint.id, 'Water', 'low')

    const result = await authorizeSupplyStatusUpdate(volunteer.user_id, otherSupplyStatus.id, 'enough')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected authorization to be rejected')
    expect(result.httpStatus).toBe(403)

    const fresh = await prisma.supplyStatus.findUniqueOrThrow({ where: { id: otherSupplyStatus.id } })
    expect(fresh.status).toBe('low')
    expect(fresh.updated_at.getTime()).toBe(otherSupplyStatus.updated_at.getTime())
  })

  it('rejects an update attempt from a volunteer unassigned to any checkpoint', async () => {
    const checkpoint = await createCheckpoint('Some Checkpoint')
    const volunteer = await createCheckpointVolunteer(null)
    const supplyStatus = await createSupplyStatus(checkpoint.id, 'Masks', 'enough')

    const result = await authorizeSupplyStatusUpdate(volunteer.user_id, supplyStatus.id, 'urgent')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected authorization to be rejected')
    expect(result.httpStatus).toBe(403)

    const fresh = await prisma.supplyStatus.findUniqueOrThrow({ where: { id: supplyStatus.id } })
    expect(fresh.status).toBe('enough')
  })

  it('rejects malformed input (invalid status enum, missing id) with 400', async () => {
    const checkpoint = await createCheckpoint('Own Checkpoint')
    const volunteer = await createCheckpointVolunteer(checkpoint.id)

    const invalidStatus = await authorizeSupplyStatusUpdate(volunteer.user_id, 'some-id', 'not-a-real-status')
    expect(invalidStatus.ok).toBe(false)
    if (!invalidStatus.ok) expect(invalidStatus.httpStatus).toBe(400)

    const missingId = await authorizeSupplyStatusUpdate(volunteer.user_id, undefined, 'urgent')
    expect(missingId.ok).toBe(false)
    if (!missingId.ok) expect(missingId.httpStatus).toBe(400)
  })
})
