// The single shared source of valid item names, used by both the new
// DeliveryLog creation flow and, potentially, any future SupplyStatus
// validation. SupplyStatus.item has no validation today (the supply-status
// PATCH route never touches item at all), so this doesn't change any
// existing behavior -- it only formalizes the set of values already
// established by convention in prisma/seed.ts.
export const SUPPLY_ITEMS = ['Food', 'Water', 'Masks', 'Gloves', 'ORS', 'Medkit', 'Blankets'] as const

export type SupplyItem = (typeof SUPPLY_ITEMS)[number]
