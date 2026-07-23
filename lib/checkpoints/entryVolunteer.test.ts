import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/shared/prisma'
import { createTestUser } from '@/lib/shared/testHelpers'
import { getEntryVolunteerContext, getRoutedCheckpoints } from '@/lib/checkpoints/checkpointVolunteer'

describe('Entry Volunteer dashboard data', () => {
  let entryPointIds: string[] = []
  let checkpointIds: string[] = []
  let volunteerIds: string[] = []
  let userIds: string[] = []
  let supplyStatusIds: string[] = []

  beforeEach(() => {
    entryPointIds = []
    checkpointIds = []
    volunteerIds = []
    userIds = []
    supplyStatusIds = []
  })

  afterEach(async () => {
    await prisma.supplyStatus.deleteMany({ where: { id: { in: supplyStatusIds } } })
    await prisma.volunteer.deleteMany({ where: { id: { in: volunteerIds } } })
    await prisma.checkpoint.deleteMany({ where: { id: { in: checkpointIds } } })
    await prisma.entryPoint.deleteMany({ where: { id: { in: entryPointIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  })

  async function createEntryPoint(name: string) {
    const entryPoint = await prisma.entryPoint.create({ data: { name } })
    entryPointIds.push(entryPoint.id)
    return entryPoint
  }

  async function createCheckpoint(name: string, entryPointId: string) {
    const checkpoint = await prisma.checkpoint.create({ data: { name, entry_point_id: entryPointId } })
    checkpointIds.push(checkpoint.id)
    return checkpoint
  }

  async function createSupplyStatus(checkpointId: string, item: string, status: 'urgent' | 'low' | 'enough') {
    const row = await prisma.supplyStatus.create({ data: { checkpoint_id: checkpointId, item, status } })
    supplyStatusIds.push(row.id)
    return row
  }

  async function createEntryVolunteer(entryPointId: string | null) {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    const volunteer = await prisma.volunteer.create({
      data: {
        name: 'Test Entry Volunteer',
        role: 'entry',
        entry_point_id: entryPointId,
        telegram_handle: `test_entry_${crypto.randomUUID()}`,
        consent_given: true,
        user_id: user.id,
      },
    })
    volunteerIds.push(volunteer.id)
    return volunteer
  }

  it('getEntryVolunteerContext resolves the fresh role and entry_point_id for an Entry Volunteer', async () => {
    const entryPoint = await createEntryPoint('Test Entry Point')
    const volunteer = await createEntryVolunteer(entryPoint.id)

    const context = await getEntryVolunteerContext(volunteer.user_id)
    expect(context).not.toBeNull()
    expect(context!.role).toBe('entry')
    expect(context!.entry_point_id).toBe(entryPoint.id)
  })

  it('getEntryVolunteerContext resolves to null for a userId with no Volunteer row (e.g. an Admin)', async () => {
    const user = await createTestUser('admin')
    userIds.push(user.id)

    const context = await getEntryVolunteerContext(user.id)
    expect(context).toBeNull()
  })

  it('getEntryVolunteerContext reports role "checkpoint" for a Checkpoint Volunteer -- page.tsx uses this to reject the Entry branch, no data leak', async () => {
    const user = await createTestUser('volunteer')
    userIds.push(user.id)
    const volunteer = await prisma.volunteer.create({
      data: {
        name: 'Test Checkpoint Volunteer',
        role: 'checkpoint',
        telegram_handle: `test_checkpoint_${crypto.randomUUID()}`,
        consent_given: true,
        user_id: user.id,
      },
    })
    volunteerIds.push(volunteer.id)

    const context = await getEntryVolunteerContext(user.id)
    expect(context!.role).toBe('checkpoint')
    expect(context!.role).not.toBe('entry')
  })

  it('getRoutedCheckpoints returns only the checkpoints (and real supply status) for the given entry point', async () => {
    const ownEntryPoint = await createEntryPoint('Own Entry Point')
    const otherEntryPoint = await createEntryPoint('Other Entry Point')
    const ownCheckpoint = await createCheckpoint('Own Checkpoint', ownEntryPoint.id)
    const otherCheckpoint = await createCheckpoint('Other Checkpoint', otherEntryPoint.id)
    await createSupplyStatus(ownCheckpoint.id, 'Food', 'urgent')
    await createSupplyStatus(otherCheckpoint.id, 'Water', 'low')

    const result = await getRoutedCheckpoints(ownEntryPoint.id)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(ownCheckpoint.id)
    expect(result[0].supplyStatuses).toHaveLength(1)
    expect(result[0].supplyStatuses[0].item).toBe('Food')
  })

  it('cross-entry-point isolation: Entry Point 2 data never appears when querying Entry Point 1, even with real data present on both', async () => {
    const entryPoint1 = await createEntryPoint('Entry Point 1 (test)')
    const entryPoint2 = await createEntryPoint('Entry Point 2 (test)')
    const checkpoint1 = await createCheckpoint('Checkpoint 1', entryPoint1.id)
    const checkpoint2 = await createCheckpoint('Checkpoint 2', entryPoint2.id)
    await createSupplyStatus(checkpoint1.id, 'Medkit', 'enough')
    await createSupplyStatus(checkpoint2.id, 'Blankets', 'urgent')

    const resultForEntryPoint1 = await getRoutedCheckpoints(entryPoint1.id)
    const checkpointIdsReturned = resultForEntryPoint1.map((c) => c.id)

    expect(checkpointIdsReturned).toContain(checkpoint1.id)
    expect(checkpointIdsReturned).not.toContain(checkpoint2.id)

    // Direct DB-state confirmation, not just a response-shape check --
    // Entry Point 2's checkpoint genuinely still exists with its own real
    // data; the isolation comes from getRoutedCheckpoints's where clause,
    // not from Entry Point 2 simply having nothing to leak.
    const freshCheckpoint2 = await prisma.checkpoint.findUniqueOrThrow({
      where: { id: checkpoint2.id },
      include: { supplyStatuses: true },
    })
    expect(freshCheckpoint2.entry_point_id).toBe(entryPoint2.id)
    expect(freshCheckpoint2.supplyStatuses).toHaveLength(1)
  })

  it('unassigned Entry Volunteer (entry_point_id null) resolves cleanly -- page.tsx renders the empty state without querying getRoutedCheckpoints at all', async () => {
    const volunteer = await createEntryVolunteer(null)

    const context = await getEntryVolunteerContext(volunteer.user_id)
    expect(context!.entry_point_id).toBeNull()
  })
})
