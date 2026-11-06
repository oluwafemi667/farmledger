import { describe, expect, it } from "vitest";
import { averageFeedPrice, flockEconomics } from "./flock-economics";

const flocks = [
  { flockId: "a", name: "A", birds: 1000, eggs: 24000, feedKg: 2800 },
  { flockId: "b", name: "B", birds: 500, eggs: 6000, feedKg: 1400 },
];

describe("flockEconomics", () => {
  const r = flockEconomics(flocks, { revenueNgn: 3_000_000, otherExpensesNgn: 300_000, feedCostPerKg: 500 });
  it("shares revenue by eggs and other costs by birds", () => {
    expect(r[0].revenueNgn).toBeCloseTo(2_400_000);
    expect(r[1].revenueNgn).toBeCloseTo(600_000);
    expect(r[0].otherCostNgn).toBeCloseTo(200_000);
    expect(r[1].otherCostNgn).toBeCloseTo(100_000);
  });
  it("uses each flock's own feed", () => {
    expect(r[0].feedCostNgn).toBe(1_400_000);
    expect(r[0].marginNgn).toBeCloseTo(2_400_000 - 1_400_000 - 200_000);
    expect(r[1].marginNgn).toBeCloseTo(600_000 - 700_000 - 100_000);
  });
  it("computes feed efficiency", () => {
    expect(r[0].feedKgPerDozen).toBeCloseTo(1.4);
    expect(r[1].feedKgPerDozen).toBeCloseTo(2.8);
    expect(r[0].fcr).toBeCloseTo(2800 / (24000 * 0.06));
  });
  it("cost per egg", () => {
    expect(r[0].costPerEggNgn).toBeCloseTo(1_600_000 / 24000);
  });
  it("has no margin when feed price is unknown", () => {
    const x = flockEconomics(flocks, { revenueNgn: 1, otherExpensesNgn: 0, feedCostPerKg: null });
    expect(x[0].marginNgn).toBeNull();
    expect(x[0].costPerEggNgn).toBeNull();
  });
  it("handles a flock with no eggs", () => {
    const x = flockEconomics([{ flockId: "z", name: "Z", birds: 10, eggs: 0, feedKg: 0 }], { revenueNgn: 100, otherExpensesNgn: 0, feedCostPerKg: 10 });
    expect(x[0].fcr).toBeNull();
    expect(x[0].costPerEggNgn).toBeNull();
  });
});

describe("averageFeedPrice", () => {
  it("weights by quantity", () => {
    expect(averageFeedPrice([{ quantityKg: 100, costNgn: 40000 }, { quantityKg: 300, costNgn: 150000 }])).toBe(475);
  });
  it("is null with no purchases", () => expect(averageFeedPrice([])).toBeNull());
});
