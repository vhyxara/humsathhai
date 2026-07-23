import { prisma } from '@/lib/shared/prisma'

// Independent, per-mutation authorization check for admin-only routes --
// reads Admin.role fresh from the DB on every call rather than trusting
// anything cached on the session, same discipline as
// authorizeSupplyStatusUpdate's checkpoint-ownership check.
export async function requireSuperAdmin(userId: string): Promise<boolean> {
  const admin = await prisma.admin.findUnique({
    where: { user_id: userId },
    select: { role: true },
  })
  return admin?.role === 'super'
}
