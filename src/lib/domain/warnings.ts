import type { Alert } from "./overview";
import { activeEggHold, adviceFor, isOpen, signLabel, type HealthRecord } from "./health";

export interface DailyPoint {
  day: string;
  eggs: number;
  deaths: number;
  feedKg: number;
}

export interface FlockWarning {
  flockId: string;
  name: string;
  level: "watch" | "attention";
  title: string;
  /** Each reason names the numbers behind it, so the owner can check them. */
  reasons: string[];
  advice: string;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * Compares the last 3 days with the 7 days before them, for one flock. Days with no
 * egg entry are ignored (a missed log is not a zero). Three signals are checked:
 * laying, deaths and feed per bird. One signal is "watch"; two or more, or a large
 * death toll, is "attention". Nothing here names a disease.
 *
 * `daily` is oldest to newest and should end today.
 */
export function flockWarning(
  flock: { id: string; name: string; activeBirds: number },
  daily: readonly DailyPoint[],
): FlockWarning | null {
  if (flock.activeBirds <= 0 || daily.length < 6) return null;
  const recent = daily.slice(-3);
  const before = daily.slice(-10, -3);
  const reasons: string[] = [];
  let severe = false;

  // Laying: hen-day rate over days that were actually logged.
  const loggedRecent = recent.filter((d) => d.eggs > 0);
  const loggedBefore = before.filter((d) => d.eggs > 0);
  if (loggedRecent.length >= 2 && loggedBefore.length >= 4) {
    const r = avg(loggedRecent.map((d) => d.eggs)) / flock.activeBirds;
    const b = avg(loggedBefore.map((d) => d.eggs)) / flock.activeBirds;
    if (b - r >= 0.04) reasons.push(`Laying fell from ${pct(b)} to ${pct(r)} (last 3 days against the 7 before).`);
  }

  // Deaths.
  const deathsRecent = recent.reduce((s, d) => s + d.deaths, 0);
  const perDayBefore = avg(before.map((d) => d.deaths));
  const share = deathsRecent / flock.activeBirds;
  if (deathsRecent >= 3 && (share >= 0.003 || deathsRecent >= 3 * Math.max(perDayBefore * 3, 1))) {
    reasons.push(
      `${deathsRecent} deaths in 3 days (${pct(share)} of the flock). The 7 days before averaged ${perDayBefore.toFixed(1)} a day.`,
    );
    if (share >= 0.005) severe = true;
  }

  // Feed per bird: sick birds usually eat less.
  const feedRecent = recent.filter((d) => d.feedKg > 0);
  const feedBefore = before.filter((d) => d.feedKg > 0);
  if (feedRecent.length >= 2 && feedBefore.length >= 4) {
    const r = avg(feedRecent.map((d) => d.feedKg));
    const b = avg(feedBefore.map((d) => d.feedKg));
    if (b > 0 && (b - r) / b >= 0.12) {
      reasons.push(`Feed given fell ${Math.round(((b - r) / b) * 100)}% (${r.toFixed(0)} kg a day against ${b.toFixed(0)} kg).`);
    }
  }

  if (reasons.length === 0) return null;
  const attention = severe || reasons.length >= 2;
  const advice = adviceFor(attention ? ["sudden_deaths"] : [], null);
  return {
    flockId: flock.id,
    name: flock.name,
    level: attention ? "attention" : "watch",
    title: attention ? `${flock.name}: warning signs, call your vet` : `${flock.name}: keep an eye on this flock`,
    reasons,
    advice: attention ? advice.text : "Check water, feed and house conditions, and record again tomorrow.",
  };
}

// ---------------------------------------------------------------- alerts for the overview

/**
 * Care alerts for the owner: warning signs in the numbers, open sick-bird reports
 * nobody has followed up, and egg holds still running. Every line names its source.
 */
export function careAlerts(input: {
  flocks: { id: string; name: string; activeBirds: number }[];
  daily: Record<string, readonly DailyPoint[]>;
  events: readonly HealthRecord[];
  today: string;
}): Alert[] {
  const out: Alert[] = [];
  for (const f of input.flocks) {
    const href = `/flocks/${f.id}`;
    const w = flockWarning(f, input.daily[f.id] ?? []);
    if (w) out.push({ id: `warn-${f.id}`, level: w.level, title: w.title, detail: `${w.reasons.join(" ")} ${w.advice}`, href });

    for (const e of input.events.filter((x) => x.flockId === f.id && isOpen(x) && !x.vetFindings)) {
      const a = adviceFor(e.signs, e.birdsAffected);
      out.push({
        id: `health-${e.id}`,
        level: a.level,
        title: `${f.name}: sick birds reported`,
        detail: `Seen on ${e.observedOn}: ${e.signs.map(signLabel).join(", ").toLowerCase()}${e.birdsAffected ? ` (about ${e.birdsAffected} birds)` : ""}. ${a.text}`,
        href,
      });
    }

    const hold = activeEggHold(input.events, f.id, input.today);
    if (hold) {
      out.push({
        id: `hold-${f.id}`, level: "attention", title: `${f.name}: eggs on hold`,
        detail: `Do not sell eggs from this flock until ${hold}. A treatment is within its withdrawal period.`, href,
      });
    }
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "attention" ? -1 : 1));
}
