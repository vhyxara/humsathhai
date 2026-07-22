import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { authorizeSupplyStatusUpdate } from '@/lib/checkpointVolunteer'

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const authorization = await authorizeSupplyStatusUpdate(session.id, body.id, body.status)

  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.httpStatus })
  }

  const updated = await prisma.supplyStatus.update({
    where: { id: authorization.supplyStatusId },
    data: { status: authorization.status },
    select: { id: true, item: true, status: true, updated_at: true },
  })

  return NextResponse.json(updated)
}
