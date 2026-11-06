import { describe, expect, it } from "vitest";
import { activeEggHold, adviceFor, type HealthRecord } from "./health";
import { careAlerts, flockWarning, type DailyPoint } from "./warnings";

const flock = { id: "f1", name: "Flock B", activeBirds: 1000 };
const days = (rows: [number, number, number][]): DailyPoint[] =>
  rows.map(([eggs, deaths, feedKg], i) => ({ day: `2026-10-${String(i + 1).padStart(2, "0")}`, eggs, deaths, feedKg }));
const steady = (n: number): [number, number, number][] => Array.from({ length: n }, () => [860, 0, 110]);

describe("flockWarning", () => {
  it("is quiet for a steady flock", () => {
    expect(flockWarning(flock, days(steady(10)))).toBeNull();
  });
  it("flags a fall in laying and names the numbers", () => {
    const w = flockWarning(flock, days([...steady(7), [780, 0, 110], [770, 0, 110], [775, 0, 110]]));
    expect(w?.level).toBe("watch");
    expect(w?.reasons[0]).toMatch(/Laying fell from 86\.0% to 77\.5%/);
  });
  it("calls for a vet when laying and deaths both turn", () => {
    const w = flockWarning(flock, days([...steady(7), [780, 3, 110], [760, 4, 108], [750, 3, 105]]));
    expect(w?.level).toBe("attention");
    expect(w?.reasons.length).toBeGreaterThanOrEqual(2);
    expect(w?.advice).toMatch(/vet/);
  });
  it("treats a missed egg log as missing, not as zero", () => {
    expect(flockWarning(flock, days([...steady(7), [0, 0, 110], [860, 0, 110], [860, 0, 110]]))).toBeNull();
  });
  it("does nothing without enough history", () => {
    expect(flockWarning(flock, days(steady(4)))).toBeNull();
  });
  it("flags falling feed use", () => {
    const w = flockWarning(flock, days([...steady(7), [860, 0, 90], [860, 0, 92], [860, 0, 91]]));
    expect(w?.reasons.some((r) => /Feed given fell/.test(r))).toBe(true);
  });
  it("never names a disease or a medicine", () => {
    const w = flockWarning(flock, days([...steady(7), [780, 3, 110], [760, 4, 108], [750, 3, 105]]));
    expect(JSON.stringify(w)).not.toMatch(/newcastle|gumboro|antibiotic|mg\b/i);
  });
});

describe("adviceFor", () => {
  it("sends urgent signs to a vet", () => {
    expect(adviceFor(["twisted_neck_paralysis"], 2).level).toBe("attention");
  });
  it("sends many signs to a vet", () => {
    expect(adviceFor(["diarrhoea", "drop_in_feed", "ruffled_feathers"], null).level).toBe("attention");
  });
  it("asks for a closer watch on a single mild sign", () => {
    expect(adviceFor(["coughing_sneezing"], 3).level).toBe("watch");
  });
});

describe("activeEggHold", () => {
  const ev = (flockId: string, until: string | null): HealthRecord => ({
    id: "e", flockId, observedOn: "2026-10-01", signs: ["diarrhoea"], birdsAffected: null, notes: null,
    vetFindings: null, treatment: null, eggHoldUntil: until, resolvedOn: null,
  });
  it("returns the latest hold still running", () => {
    expect(activeEggHold([ev("a", "2026-10-20"), ev("a", "2026-10-25")], "a", "2026-10-22")).toBe("2026-10-25");
  });
  it("ignores holds that ended and other flocks", () => {
    expect(activeEggHold([ev("a", "2026-10-10"), ev("b", "2026-10-30")], "a", "2026-10-22")).toBeNull();
  });
  it("counts the last day of the hold", () => {
    expect(activeEggHold([ev("a", "2026-10-22")], "a", "2026-10-22")).toBe("2026-10-22");
  });
});

describe("careAlerts", () => {
  const rec = (over: Partial<HealthRecord>): HealthRecord => ({
    id: "e1", flockId: "f1", observedOn: "2026-10-20", signs: ["coughing_sneezing", "drop_in_feed"], birdsAffected: 12, notes: null,
    vetFindings: null, treatment: null, eggHoldUntil: null, resolvedOn: null, ...over,
  });
  const base = { flocks: [flock], daily: {}, today: "2026-10-22" };
  it("raises an alert for a sick-bird report nobody has followed up", () => {
    const a = careAlerts({ ...base, events: [rec({})] });
    expect(a).toHaveLength(1);
    expect(a[0].title).toMatch(/sick birds reported/);
    expect(a[0].detail).toMatch(/coughing or sneezing/);
  });
  it("stops alerting once the vet's findings are recorded", () => {
    expect(careAlerts({ ...base, events: [rec({ vetFindings: "Mild infection" })] })).toHaveLength(0);
  });
  it("raises an egg hold alert while the hold runs", () => {
    const a = careAlerts({ ...base, events: [rec({ vetFindings: "x", eggHoldUntil: "2026-10-25" })] });
    expect(a[0].title).toMatch(/eggs on hold/);
    expect(a[0].detail).toMatch(/2026-10-25/);
  });
  it("puts attention alerts first", () => {
    const a = careAlerts({ ...base, events: [rec({ signs: ["coughing_sneezing"], birdsAffected: 2 }), rec({ id: "e2", signs: ["sudden_deaths"] })] });
    expect(a[0].level).toBe("attention");
  });
});
