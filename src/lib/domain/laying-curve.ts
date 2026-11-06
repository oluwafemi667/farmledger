import { addDays, daysBetween } from "./dates";

/**
 * Typical hen-day production (%) of a commercial brown layer by age in weeks,
 * read from the usual breeder management guides. Real standards differ a little
 * by breed and strain, so this is a reference line to judge a flock against, not
 * a target to the decimal. Replace the points with your breeder's guide to match it.
 */
const POINTS: [week: number, pct: number][] = [
  [17, 0], [18, 5], [19, 22], [20, 50], [21, 74], [22, 86], [23, 91], [24, 93.5], [26, 95], [30, 95.5],
  [36, 94.5], [44, 92.5], [52, 90], [60, 87], [70, 82.5], [80, 77.5], [90, 72], [100, 66],
];

/** Expected hen-day as a fraction (0 to 1) at an age in days. Null before laying age or past the guide. */
export function expectedHenDay(ageDays: number): number | null {
  const w = ageDays / 7;
  if (w < POINTS[0][0] || w > POINTS[POINTS.length - 1][0]) return null;
  for (let i = 1; i < POINTS.length; i++) {
    const [w1, p1] = POINTS[i];
    if (w <= w1) {
      const [w0, p0] = POINTS[i - 1];
      return (p0 + ((p1 - p0) * (w - w0)) / (w1 - w0)) / 100;
    }
  }
  return null;
}

/**
 * Expected eggs for each day of the chart. Each flock contributes its birds
 * times the standard for its age on that day.
 */
export function expectedEggsSeries(
  days: { day: string; birds: number }[],
  flocks: { birds: number; ageDays: number }[],
  today: string,
): (number | null)[] {
  const total = flocks.reduce((s, f) => s + f.birds, 0);
  if (total <= 0) return days.map(() => null);
  return days.map((d) => {
    const back = daysBetween(d.day, today);
    let rate = 0;
    let covered = 0;
    for (const f of flocks) {
      const r = expectedHenDay(f.ageDays - back);
      if (r === null) continue;
      rate += r * f.birds;
      covered += f.birds;
    }
    // Only draw a line when most of the birds have a standard for that day.
    if (covered / total < 0.6) return null;
    return Math.round((rate / covered) * d.birds);
  });
}

export { addDays };
