import { describe, expect, it } from "vitest";
import { expectedEggsSeries, expectedHenDay } from "./laying-curve";

describe("expectedHenDay", () => {
  it("is null before laying age and past the guide", () => {
    expect(expectedHenDay(100)).toBeNull();
    expect(expectedHenDay(800)).toBeNull();
  });
  it("peaks near 95% in the high twenties of weeks", () => {
    expect(expectedHenDay(28 * 7)).toBeGreaterThan(0.94);
  });
  it("rises through onset and falls with age", () => {
    expect(expectedHenDay(21 * 7)!).toBeGreaterThan(expectedHenDay(19 * 7)!);
    expect(expectedHenDay(70 * 7)!).toBeLessThan(expectedHenDay(40 * 7)!);
  });
  it("interpolates between points", () => {
    expect(expectedHenDay(20.5 * 7)).toBeCloseTo(0.62, 2);
  });
});

describe("expectedEggsSeries", () => {
  it("multiplies birds by the standard for the age on that day", () => {
    const s = expectedEggsSeries(
      [{ day: "2026-11-03", birds: 1000 }, { day: "2026-11-04", birds: 1000 }],
      [{ birds: 1000, ageDays: 30 * 7 }],
      "2026-11-04",
    );
    expect(s[0]).toBeGreaterThan(940);
    expect(s[1]).toBeGreaterThan(940);
  });
  it("draws nothing when the flocks are too young", () => {
    expect(expectedEggsSeries([{ day: "2026-11-04", birds: 100 }], [{ birds: 100, ageDays: 40 }], "2026-11-04")).toEqual([null]);
  });
});
