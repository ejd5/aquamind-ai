/**
 * AQWELIA AutoRestock™ — restock engine.
 *
 * Estimates how many days of supply are left for each product in the user's
 * inventory, based on:
 *   - the product's category (ph_minus, chlorine_slow, …)
 *   - the pool's volume + treatment type (chlorine / salt / bromine …)
 *   - a heuristic weekly consumption rate per category per m³ of pool volume
 *
 * If the estimated remaining days is < LOW_STOCK_THRESHOLD (7), the product is
 * flagged as "low" and a RestockItem is returned with a recommended order qty.
 *
 * i18n strategy: this engine is pure (no UI). The recommended product name is
 * derived from the inventory row's `productName` (user-entered), and the
 * category label is exposed via `categoryLabelKey` (`restock.categoryLabel.<c>`)
 * so the UI can call `t(categoryLabelKey)` for display.
 */

export interface ProductInventoryInput {
  id: string
  productName: string
  category: string // ph_minus | ph_plus | chlorine_slow | chlorine_shock | salt | alkalinity_plus | stabilizer | flocculant | anti_algae | filter_cleaner | other
  quantity: number
  unit: string // kg | L | tablet
  concentration?: number | null
}

export interface WaterTestInputLite {
  ph: number
  freeChlorine?: number | null
  alkalinity?: number | null
  cyanuricAcid?: number | null
  salt?: number | null
  temperature?: number | null
  createdAt: string | Date
}

export interface PoolProfileInputLite {
  volume: number // m³
  unit: string // m3 | gal
  treatmentType: string // chlorine | salt | bromine | active_oxygen | other
  saltSystem: boolean
}

export type RestockUrgency = 'low' | 'medium' | 'high'

export interface RestockItem {
  productId: string
  productName: string
  category: string
  categoryLabelKey: string // e.g. 'restock.categoryLabel.ph_minus'
  /** Current quantity remaining (raw). */
  currentQuantity: number
  unit: string
  /** Estimated weekly consumption in the product's unit. */
  weeklyConsumption: number
  /** Estimated days remaining at current consumption rate. */
  daysRemaining: number
  /** Recommended order quantity (= 4 weeks of consumption, rounded up). */
  recommendedOrderQty: number
  urgency: RestockUrgency
  /** Optional Care deeplink (UI fills the host). */
  carePath: string
}

export interface RestockAssessment {
  items: RestockItem[]
  lowStockCount: number
  hasInventory: boolean
}

export const LOW_STOCK_THRESHOLD_DAYS = 7
export const CRITICAL_STOCK_THRESHOLD_DAYS = 3
export const RECOMMENDED_WEEKS_OF_SUPPLY = 4

// ───────────────────────────────────────────────────────────────────────────
// Heuristic weekly consumption rates per category, expressed per m³ of pool
// volume. The values are deliberately conservative (industry rules of thumb):
//   - pH- : ~3 g / m³ / week (average bather load + heat)
//   - pH+ : ~1 g / m³ / week
//   - chlorine_slow : ~5 g / m³ / week (slow tabs, 1 tab ≈ 20g for 4m³)
//   - chlorine_shock : ~2 g / m³ / week (only if needed, weighted by 0.4)
//   - salt : only for salt pools, ~5 g / m³ / week (top-ups)
//   - alkalinity_plus : ~2 g / m³ / week
//   - stabilizer : ~0.4 g / m³ / week (very low consumption)
//   - flocculant : ~0.3 g / m³ / week
//   - anti_algae : ~1 g / m³ / week
//   - filter_cleaner : ~0.5 g / m³ / week
// ───────────────────────────────────────────────────────────────────────────
const WEEKLY_CONSUMPTION_PER_M3: Record<string, number> = {
  ph_minus: 3,
  ph_plus: 1,
  chlorine_slow: 5,
  chlorine_shock: 2,
  salt: 5,
  alkalinity_plus: 2,
  stabilizer: 0.4,
  flocculant: 0.3,
  anti_algae: 1,
  filter_cleaner: 0.5,
  other: 0.5,
}

// Apply a multiplier when the recent water tests indicate the parameter is
// chronically out of range (more product needed).
function imbalanceMultiplier(category: string, tests: WaterTestInputLite[]): number {
  if (tests.length === 0) return 1
  const last3 = tests.slice(0, 3)
  switch (category) {
    case 'ph_minus': {
      // If pH is chronically > 7.4 → more pH- needed.
      const highPh = last3.filter((t) => t.ph > 7.4).length
      return 1 + highPh * 0.3
    }
    case 'ph_plus': {
      const lowPh = last3.filter((t) => t.ph < 7.0).length
      return 1 + lowPh * 0.3
    }
    case 'chlorine_slow':
    case 'chlorine_shock': {
      const lowCl = last3.filter((t) => (t.freeChlorine ?? 0) < 1).length
      return 1 + lowCl * 0.4
    }
    case 'alkalinity_plus': {
      const lowTac = last3.filter((t) => (t.alkalinity ?? 100) < 80).length
      return 1 + lowTac * 0.3
    }
    case 'stabilizer': {
      const lowCya = last3.filter((t) => (t.cyanuricAcid ?? 40) < 30).length
      return 1 + lowCya * 0.2
    }
    case 'salt': {
      const lowSalt = last3.filter((t) => (t.salt ?? 4) < 3).length
      return 1 + lowSalt * 0.4
    }
    default:
      return 1
  }
}

function categoryLabelKey(category: string): string {
  return `restock.categoryLabel.${category}`
}

function carePath(category: string): string {
  return `/care/catalogue?cat=${encodeURIComponent(category)}`
}

function recommendedOrderQty(weeklyConsumption: number): number {
  const total = weeklyConsumption * RECOMMENDED_WEEKS_OF_SUPPLY
  // Round to 1 decimal place, minimum 1 unit.
  return Math.max(1, Math.round(total * 10) / 10)
}

function urgencyFromDays(days: number): RestockUrgency {
  if (days <= CRITICAL_STOCK_THRESHOLD_DAYS) return 'high'
  if (days <= LOW_STOCK_THRESHOLD_DAYS) return 'medium'
  return 'low'
}

/**
 * Calculate restock needs for the given inventory + recent water tests.
 * Returns one RestockItem per inventory row, with `urgency` flagging the ones
 * that need ordering within the next ~7 days.
 */
export function calculateRestockNeeds(
  inventory: ProductInventoryInput[],
  waterTests: WaterTestInputLite[],
  pool: PoolProfileInputLite,
): RestockAssessment {
  if (inventory.length === 0) {
    return { items: [], lowStockCount: 0, hasInventory: false }
  }

  // Normalize pool volume to m³ (1 gal ≈ 0.003785 m³).
  const volumeM3 = pool.unit === 'gal' ? pool.volume * 0.003785 : pool.volume
  // Salt-only adjustment: if salt pool, ignore salt consumption unless treatmentType is salt.
  const isSaltPool = pool.saltSystem || pool.treatmentType === 'salt'

  const items: RestockItem[] = inventory.map((p) => {
    const baseRate = WEEKLY_CONSUMPTION_PER_M3[p.category] ?? WEEKLY_CONSUMPTION_PER_M3.other
    const multiplier = imbalanceMultiplier(p.category, waterTests)
    // Salt consumption is only relevant for salt pools.
    const saltFactor = p.category === 'salt' && !isSaltPool ? 0 : 1
    // "tablet" unit: approximate as 1 tablet = 20 g for chlorine_slow, 1 tablet = 5 g for shock.
    const tabletConversion =
      p.unit === 'tablet'
        ? p.category === 'chlorine_slow'
          ? 1 / 20
          : p.category === 'chlorine_shock'
            ? 1 / 5
            : 1 / 10
        : 1

    const weeklyConsumption =
      baseRate * volumeM3 * multiplier * saltFactor * tabletConversion

    // Days remaining = current qty / weekly consumption × 7
    const daysRemaining =
      weeklyConsumption > 0
        ? Math.round((p.quantity / weeklyConsumption) * 7)
        : 9999 // No expected consumption → never runs out

    const urgency = urgencyFromDays(daysRemaining)

    return {
      productId: p.id,
      productName: p.productName,
      category: p.category,
      categoryLabelKey: categoryLabelKey(p.category),
      currentQuantity: p.quantity,
      unit: p.unit,
      weeklyConsumption:
        Math.round(weeklyConsumption * 100) / 100,
      daysRemaining,
      recommendedOrderQty: recommendedOrderQty(weeklyConsumption),
      urgency,
      carePath: carePath(p.category),
    }
  })

  // Sort: highest urgency first (low days → high days).
  items.sort((a, b) => a.daysRemaining - b.daysRemaining)

  const lowStockCount = items.filter((i) => i.urgency !== 'low').length

  return { items, lowStockCount, hasInventory: true }
}
