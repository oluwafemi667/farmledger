import { describe, expect, it } from "vitest";
import { buildDailyStatus, type DailyStatusInput } from "./daily-status";

const A = "flock-a";
const B = "flock-b";

const base: DailyStatusInput = {
  today: "2026-11-03",
  flockIds: [A, B],
  eggRows: [],
  feedRows: [],
  mortalityRows: [],
  scheduleRows: [],
  doneScheduleIds: new Set(),
};

describe("daily status", () => {
  it("sums several collections on the same day", () => {
    const status = buildDailyStatus({
      ...base,
      eggRows: [
        { flock_id: A, collected_on: "2026-11-03", eggs: 130 },
        { flock_id: A, collected_on: "2026-11-03", eggs: 90 },
        { flock_id: B, collected_on: "2026-11-03", eggs: 40 },
      ],
    });
    expect(status.get(A)).toMatchObject({ eggsToday: 220, eggEntriesToday: 2 });
    expect(status.get(B)).toMatchObject({ eggsToday: 40, eggEntriesToday: 1 });
  });

  it("compares with the latest earlier day that has data, even after a gap", () => {
    const status = buildDailyStatus({
      ...base,
      eggRows: [
        { flock_id: A, collected_on: "2026-11-01", eggs: 200 },
        { flock_id: A, collected_on: "2026-11-01", eggs: 212 },
        { flock_id: A, collected_on: "2026-10-30", eggs: 999 },
      ],
    });
    expect(status.get(A)).toMatchObject({ previousEggs: 412, previousDate: "2026-11-01", eggEntriesToday: 0 });
  });

  it("reports no comparison when a flock has no earlier records", () => {
    const status = buildDailyStatus(base);
    expect(status.get(A)).toMatchObject({ previousEggs: null, previousDate: null, eggsToday: 0 });
  });

  it("keeps flocks separate for feed and deaths", () => {
    const status = buildDailyStatus({
      ...base,
      feedRows: [
        { flock_id: A, quantity_kg: "125.5" },
        { flock_id: A, quantity_kg: 25 },
      ],
      mortalityRows: [{ flock_id: B, birds: 3 }],
    });
    expect(status.get(A)).toMatchObject({ feedKgToday: 150.5, feedEntriesToday: 2, deathsToday: 0 });
    expect(status.get(B)).toMatchObject({ feedKgToday: 0, deathsToday: 3 });
  });

  it("lists overdue and soon-due vaccines, oldest first, and hides done or distant ones", () => {
    const status = buildDailyStatus({
      ...base,
      scheduleRows: [
        { id: "s1", flock_id: A, vaccine_name: "Fowl pox", due_on: "2026-11-08" },
        { id: "s2", flock_id: A, vaccine_name: "Bronchitis", due_on: "2026-11-01" },
        { id: "s3", flock_id: A, vaccine_name: "Already given", due_on: "2026-10-20" },
        { id: "s4", flock_id: A, vaccine_name: "Next month", due_on: "2026-12-01" },
      ],
      doneScheduleIds: new Set(["s3"]),
    });
    const due = status.get(A)!.dueVaccines;
    expect(due.map((v) => v.vaccineName)).toEqual(["Bronchitis", "Fowl pox"]);
    expect(due[0].daysUntil).toBe(-2);
    expect(due[1].daysUntil).toBe(5);
  });
});
