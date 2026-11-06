import { addDays } from "./dates";
import { henDayRate } from "./metrics";

/** One day of farm-wide figures, as returned by `farm_daily`. */
export interface FarmDay {
  day: string;
  birds: number;
  eggs: number;
  broken: number;
  deaths: number;
  feedKg: number;
}

export interface MoneyDay {
  day: string;
  salesNgn: number;
  invoicedNgn: number;
  collectedNgn: number;
  expensesNgn: number;
}

export interface ChartPoint {
  day: string;
  eggs: number;
  /** True when no eggs were recorded: a gap in the records, not a zero. */
  unlogged: boolean;
  /** Mean eggs over the logged days in the trailing window, or null. */
  average: number | null;
}

/** Trailing mean over logged days only, so a missed day does not drag the line down. */
export function chartSeries(days: FarmDay[], window = 7): ChartPoint[] {
  return days.map((d, i) => {
    const slice = days.slice(Math.max(0, i - window + 1), i + 1).filter((x) => x.eggs > 0);
    return {
      day: d.day,
      eggs: d.eggs,
      unlogged: d.eggs <= 0,
      average: slice.length ? slice.reduce((s, x) => s + x.eggs, 0) / slice.length : null,
    };
  });
}

export interface Headline {
  liveBirds: number;
  eggsToday: number | null;
  eggsYesterday: number | null;
  henDayToday: number | null;
  /** Hen-day over the last 7 logged days. */
  henDay7: number | null;
  henDayPrev7: number | null;
  deaths7: number;
  mortality7: number | null;
  feedGramsPerBird: number | null;
}

function henDayOver(days: FarmDay[]): number | null {
  const logged = days.filter((d) => d.eggs > 0 && d.birds > 0);
  if (logged.length === 0) return null;
  const eggs = logged.reduce((s, d) => s + d.eggs, 0);
  const birdDays = logged.reduce((s, d) => s + d.birds, 0);
  return eggs / birdDays;
}

/** `days` must be ascending and end on today. */
export function headline(days: FarmDay[]): Headline {
  const today = days[days.length - 1];
  const yesterday = days[days.length - 2];
  const last7 = days.slice(-7);
  const prev7 = days.slice(-14, -7);
  const deaths7 = last7.reduce((s, d) => s + d.deaths, 0);
  const birds = today?.birds ?? 0;
  const feedDays = last7.filter((d) => d.feedKg > 0);
  const feedKg = feedDays.reduce((s, d) => s + d.feedKg, 0);
  const feedBirdDays = feedDays.reduce((s, d) => s + d.birds, 0);
  return {
    liveBirds: birds,
    eggsToday: today && today.eggs > 0 ? today.eggs : null,
    eggsYesterday: yesterday && yesterday.eggs > 0 ? yesterday.eggs : null,
    henDayToday: today && today.eggs > 0 ? henDayRate(today.eggs, today.birds) : null,
    henDay7: henDayOver(last7),
    henDayPrev7: henDayOver(prev7),
    deaths7,
    mortality7: birds + deaths7 > 0 ? deaths7 / (birds + deaths7) : null,
    feedGramsPerBird: feedBirdDays > 0 ? (feedKg * 1000) / feedBirdDays : null,
  };
}

export interface MoneySummary {
  revenue: number;
  expenses: number;
  margin: number;
  collected: number;
  /** All recorded costs divided by eggs collected in the same window. */
  costPerEgg: number | null;
}

export function moneySummary(money: MoneyDay[], eggs: number): MoneySummary {
  const revenue = money.reduce((s, d) => s + d.salesNgn + d.invoicedNgn, 0);
  const expenses = money.reduce((s, d) => s + d.expensesNgn, 0);
  const collected = money.reduce((s, d) => s + d.salesNgn + d.collectedNgn, 0);
  return {
    revenue,
    expenses,
    margin: revenue - expenses,
    collected,
    costPerEgg: eggs > 0 && expenses > 0 ? expenses / eggs : null,
  };
}

/** "N 1,250,000", or "N 1.25m" when compact. */
export function formatNgn(value: number, compact = false): string {
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  if (compact && v >= 1_000_000) return `${sign}N ${(v / 1_000_000).toFixed(2)}m`;
  if (compact && v >= 10_000) return `${sign}N ${Math.round(v / 1000).toLocaleString("en-NG")}k`;
  return `${sign}N ${Math.round(v).toLocaleString("en-NG")}`;
}

export type AlertLevel = "attention" | "watch";
export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  href?: string;
}

export interface AlertFlock {
  id: string;
  name: string;
  activeBirds: number;
  eggsToday: number | null;
  eggsYesterday: number;
  deathsToday: number;
  vaccinesOverdue: number;
  nextVaccineName: string | null;
}

/**
 * Rules, not guesses: every alert names the rule that fired and the numbers
 * behind it. Thresholds are deliberately conservative so alerts stay rare
 * enough to be believed.
 */
export function buildAlerts(flocks: AlertFlock[], opts: { eveningHour?: number; nowHour: number }): Alert[] {
  const out: Alert[] = [];
  const evening = opts.eveningHour ?? 15;
  for (const f of flocks) {
    const href = `/flocks/${f.id}`;
    if (f.vaccinesOverdue > 0) {
      out.push({
        id: `vax-${f.id}`,
        level: "attention",
        title: `${f.name}: vaccination overdue`,
        detail: f.nextVaccineName ? `${f.nextVaccineName} is past its due date.` : "A scheduled vaccine is past its due date.",
        href,
      });
    }
    const pct = f.activeBirds > 0 ? (f.deathsToday / f.activeBirds) * 100 : 0;
    if (f.deathsToday >= 3 && pct >= 0.25) {
      out.push({
        id: `mort-${f.id}`,
        level: "attention",
        title: `${f.name}: ${f.deathsToday} deaths today`,
        detail: `${pct.toFixed(2)}% of live birds in one day. Check water, ventilation and signs of disease.`,
        href,
      });
    }
    if (f.eggsToday !== null && f.eggsYesterday > 0 && f.activeBirds > 0) {
      const drop = (f.eggsYesterday - f.eggsToday) / f.activeBirds;
      if (drop >= 0.05) {
        out.push({
          id: `drop-${f.id}`,
          level: "attention",
          title: `${f.name}: laying down ${(drop * 100).toFixed(1)} points`,
          detail: `${f.eggsToday.toLocaleString("en-NG")} eggs today against ${f.eggsYesterday.toLocaleString("en-NG")} yesterday.`,
          href,
        });
      }
    }
    if (f.eggsToday === null && opts.nowHour >= evening) {
      out.push({
        id: `unlogged-${f.id}`,
        level: "watch",
        title: `${f.name}: no eggs recorded`,
        detail: "Nothing logged today yet. A missed collection looks like a zero until it is entered.",
        href,
      });
    }
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "attention" ? -1 : 1));
}

export function windowStart(today: string, days: number): string {
  return addDays(today, -(days - 1));
}
