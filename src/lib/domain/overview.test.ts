import { describe, expect, it } from "vitest";
import { buildAlerts, chartSeries, formatNgn, headline, moneySummary, type FarmDay } from "./overview";

const day = (n: number, o: Partial<FarmDay> = {}): FarmDay => ({
  day: `2026-10-${String(n).padStart(2, "0")}`,
  birds: 1000,
  eggs: 850,
  broken: 5,
  deaths: 0,
  feedKg: 110,
  ...o,
});

describe("chartSeries", () => {
  it("marks unrecorded days and keeps them out of the average", () => {
    const s = chartSeries([day(1, { eggs: 800 }), day(2, { eggs: 0 }), day(3, { eggs: 900 })], 3);
    expect(s[1].unlogged).toBe(true);
    expect(s[2].average).toBe(850);
  });
});

describe("headline", () => {
  const days = Array.from({ length: 14 }, (_, i) => day(i + 1, { eggs: i === 13 ? 0 : 850, deaths: i === 12 ? 4 : 0 }));
  it("treats an unrecorded today as unknown, not zero", () => {
    const h = headline(days);
    expect(h.eggsToday).toBeNull();
    expect(h.henDayToday).toBeNull();
    expect(h.eggsYesterday).toBe(850);
  });
  it("computes hen-day over logged days only", () => {
    expect(headline(days).henDay7).toBeCloseTo(0.85, 5);
  });
  it("computes seven-day mortality against birds at risk", () => {
    expect(headline(days).mortality7).toBeCloseTo(4 / 1004, 5);
  });
});

describe("moneySummary", () => {
  it("counts sales plus invoices as revenue and cash in as sales plus payments", () => {
    const m = moneySummary(
      [{ day: "d", salesNgn: 100, invoicedNgn: 400, collectedNgn: 150, expensesNgn: 300 }],
      1000,
    );
    expect(m).toMatchObject({ revenue: 500, expenses: 300, margin: 200, collected: 250 });
    expect(m.costPerEgg).toBeCloseTo(0.3);
  });
});

describe("formatNgn", () => {
  it("formats plainly and compactly", () => {
    expect(formatNgn(1250000)).toBe("N 1,250,000");
    expect(formatNgn(1250000, true)).toBe("N 1.25m");
    expect(formatNgn(-42000, true)).toBe("-N 42k");
  });
});

describe("buildAlerts", () => {
  const f = { id: "a", name: "Flock A", activeBirds: 1000, eggsToday: 800, eggsYesterday: 870, deathsToday: 0, vaccinesOverdue: 0, nextVaccineName: null };
  it("fires on a laying drop of five points or more", () => {
    expect(buildAlerts([f], { nowHour: 10 }).map((a) => a.id)).toEqual(["drop-a"]);
    expect(buildAlerts([{ ...f, eggsToday: 830 }], { nowHour: 10 })).toEqual([]);
  });
  it("only flags a missing collection in the afternoon", () => {
    const g = { ...f, eggsToday: null };
    expect(buildAlerts([g], { nowHour: 9 })).toEqual([]);
    expect(buildAlerts([g], { nowHour: 16 })[0].level).toBe("watch");
  });
  it("ranks attention above watch", () => {
    const out = buildAlerts([{ ...f, id: "b", eggsToday: null }, { ...f, vaccinesOverdue: 1 }], { nowHour: 16 });
    expect(out[0].level).toBe("attention");
  });
  it("flags a mortality spike", () => {
    expect(buildAlerts([{ ...f, deathsToday: 4 }], { nowHour: 10 }).some((a) => a.id === "mort-a")).toBe(true);
  });
});
