/**
 * Farm metrics. Every screen derives its figures from these functions so a
 * number can never mean two different things in two places.
 */

/**
 * Hen-day production: eggs collected divided by live hens, as a fraction.
 * Returns null when there are no live birds, because a rate is meaningless then.
 */
export function henDayRate(eggs: number, liveBirds: number): number | null {
  if (liveBirds <= 0) return null;
  return eggs / liveBirds;
}

/** Fraction of collected eggs that were broken or cracked. */
export function brokenRate(broken: number, eggs: number): number | null {
  if (eggs <= 0) return null;
  return broken / eggs;
}

/**
 * Live birds. Not clamped at zero: a negative number means the records are
 * inconsistent and should be surfaced, not hidden.
 */
export function activeBirds(initialCount: number, totalLost: number): number {
  return initialCount - totalLost;
}

/** Grams of feed per bird per day. */
export function feedGramsPerBird(kg: number, liveBirds: number): number | null {
  if (liveBirds <= 0) return null;
  return (kg * 1000) / liveBirds;
}

/** Percentage points between two fractions, e.g. 0.849 vs 0.867 is -1.8. */
export function pointsChange(current: number, previous: number): number {
  return Math.round((current - previous) * 1000) / 10;
}

/** "84.9" for 0.849. The caller adds the % sign so it can style it separately. */
export function formatPercent(rate: number | null, digits = 1): string {
  return rate === null ? "-" : (rate * 100).toFixed(digits);
}
