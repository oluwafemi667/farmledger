/**
 * Profit per flock, worked out from records the farm already keeps.
 *
 * Sales and expenses are recorded for the whole farm, not per flock, so some of
 * each has to be shared out. The rules are fixed and shown to the owner:
 *   - feed cost: the flock's own feed (kg) at the farm's average price per kg
 *   - revenue: shared by each flock's share of eggs collected
 *   - everything else spent (labour, medication, utilities...): shared by birds
 * Treat the result as a well-founded estimate for comparing flocks, not an audit figure.
 */
export interface FlockInput {
  flockId: string;
  name: string;
  birds: number;
  eggs: number;
  feedKg: number;
}

export interface FlockEconomics extends FlockInput {
  /** Kilograms of feed per dozen eggs. Lower is better. */
  feedKgPerDozen: number | null;
  /** Feed kg per kg of eggs, assuming `EGG_WEIGHT_KG` per egg. Lower is better. */
  fcr: number | null;
  feedCostNgn: number | null;
  otherCostNgn: number;
  revenueNgn: number;
  marginNgn: number | null;
  costPerEggNgn: number | null;
}

export const EGG_WEIGHT_KG = 0.06;

export function flockEconomics(
  flocks: FlockInput[],
  pool: { revenueNgn: number; otherExpensesNgn: number; feedCostPerKg: number | null },
): FlockEconomics[] {
  const eggs = flocks.reduce((s, f) => s + f.eggs, 0);
  const birds = flocks.reduce((s, f) => s + f.birds, 0);
  return flocks.map((f) => {
    const revenueNgn = eggs > 0 ? (pool.revenueNgn * f.eggs) / eggs : 0;
    const otherCostNgn = birds > 0 ? (pool.otherExpensesNgn * f.birds) / birds : 0;
    const feedCostNgn = pool.feedCostPerKg === null ? null : f.feedKg * pool.feedCostPerKg;
    const cost = feedCostNgn === null ? null : feedCostNgn + otherCostNgn;
    return {
      ...f,
      feedKgPerDozen: f.eggs > 0 && f.feedKg > 0 ? f.feedKg / (f.eggs / 12) : null,
      fcr: f.eggs > 0 && f.feedKg > 0 ? f.feedKg / (f.eggs * EGG_WEIGHT_KG) : null,
      feedCostNgn,
      otherCostNgn,
      revenueNgn,
      marginNgn: cost === null ? null : revenueNgn - cost,
      costPerEggNgn: cost !== null && f.eggs > 0 ? cost / f.eggs : null,
    };
  });
}

/** Average price per kg across purchases; null when nothing was bought. */
export function averageFeedPrice(purchases: { quantityKg: number; costNgn: number }[]): number | null {
  const kg = purchases.reduce((s, p) => s + p.quantityKg, 0);
  return kg > 0 ? purchases.reduce((s, p) => s + p.costNgn, 0) / kg : null;
}
