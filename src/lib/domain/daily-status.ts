import { daysBetween } from "./dates";

export interface DueVaccine {
  scheduleId: string;
  vaccineName: string;
  dueOn: string;
  /** Negative when overdue. */
  daysUntil: number;
}

/** What has and has not been recorded for one flock today. */
export interface FlockDay {
  flockId: string;
  eggsToday: number;
  eggEntriesToday: number;
  /** Total from the most recent earlier day with any collection, for comparison. */
  previousEggs: number | null;
  previousDate: string | null;
  feedKgToday: number;
  feedEntriesToday: number;
  deathsToday: number;
  /** Not yet administered and due within a week, or overdue. */
  dueVaccines: DueVaccine[];
}

export interface DailyStatusInput {
  today: string;
  flockIds: string[];
  eggRows: { flock_id: string; collected_on: string; eggs: number }[];
  feedRows: { flock_id: string; quantity_kg: number | string }[];
  mortalityRows: { flock_id: string; birds: number }[];
  scheduleRows: { id: string; flock_id: string; vaccine_name: string; due_on: string }[];
  /** schedule ids that already have an administration record. */
  doneScheduleIds: Set<string>;
}

/**
 * Summarises today's records per flock. Egg entries are additive (several
 * collections a day sum together), so two people logging the same flock never
 * overwrite each other.
 */
export function buildDailyStatus(input: DailyStatusInput): Map<string, FlockDay> {
  const out = new Map<string, FlockDay>();

  for (const flockId of input.flockIds) {
    const eggs = input.eggRows.filter((r) => r.flock_id === flockId);
    const todayEggs = eggs.filter((r) => r.collected_on === input.today);

    const earlier = new Map<string, number>();
    for (const r of eggs) {
      if (r.collected_on < input.today) {
        earlier.set(r.collected_on, (earlier.get(r.collected_on) ?? 0) + r.eggs);
      }
    }
    const previousDate = [...earlier.keys()].sort().pop() ?? null;

    const feed = input.feedRows.filter((r) => r.flock_id === flockId);
    const deaths = input.mortalityRows.filter((r) => r.flock_id === flockId);

    const dueVaccines = input.scheduleRows
      .filter((s) => s.flock_id === flockId && !input.doneScheduleIds.has(s.id))
      .map((s) => ({
        scheduleId: s.id,
        vaccineName: s.vaccine_name,
        dueOn: s.due_on,
        daysUntil: daysBetween(input.today, s.due_on),
      }))
      .filter((v) => v.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    out.set(flockId, {
      flockId,
      eggsToday: todayEggs.reduce((n, r) => n + r.eggs, 0),
      eggEntriesToday: todayEggs.length,
      previousEggs: previousDate ? (earlier.get(previousDate) ?? null) : null,
      previousDate,
      feedKgToday: feed.reduce((n, r) => n + Number(r.quantity_kg), 0),
      feedEntriesToday: feed.length,
      deathsToday: deaths.reduce((n, r) => n + r.birds, 0),
      dueVaccines,
    });
  }
  return out;
}
