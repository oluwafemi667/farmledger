import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  deviceToday,
  formatAge,
  isIsoDate,
  todayIn,
} from "./dates";
import {
  activeBirds,
  brokenRate,
  feedGramsPerBird,
  formatPercent,
  henDayRate,
  pointsChange,
} from "./metrics";
import {
  eggCollectionSchema,
  feedSchema,
  fieldErrors,
  flockSchema,
  mortalitySchema,
  vaccinationSchema,
} from "./schemas";
import { formatCrates, formatKg, toCrates, toKg } from "./units";

const TODAY = "2026-11-03";
const FLOCK = "00000000-0000-4000-8000-0000000a0001";

describe("units", () => {
  it("splits eggs into crates of 30 and loose eggs", () => {
    expect(toCrates(0)).toEqual({ crates: 0, loose: 0 });
    expect(toCrates(29)).toEqual({ crates: 0, loose: 29 });
    expect(toCrates(30)).toEqual({ crates: 1, loose: 0 });
    expect(toCrates(412)).toEqual({ crates: 13, loose: 22 });
  });

  it("formats crates in plain words", () => {
    expect(formatCrates(0)).toBe("0 eggs");
    expect(formatCrates(1)).toBe("1 egg");
    expect(formatCrates(30)).toBe("1 crate");
    expect(formatCrates(412)).toBe("13 crates 22 eggs");
  });

  it("converts bags of 25 kg to kilograms and rounds to 2 places", () => {
    expect(toKg(2, "bag")).toBe(50);
    expect(toKg(0.5, "bag")).toBe(12.5);
    expect(toKg(12.345, "kg")).toBe(12.35);
  });

  it("shows bags only when there is at least one", () => {
    expect(formatKg(10)).toBe("10 kg");
    expect(formatKg(50)).toContain("2 bags");
  });
});

describe("metrics", () => {
  it("computes hen-day rate as eggs over live birds", () => {
    expect(henDayRate(849, 1000)).toBeCloseTo(0.849);
  });

  it("returns null instead of dividing by zero birds", () => {
    expect(henDayRate(10, 0)).toBeNull();
    expect(henDayRate(10, -5)).toBeNull();
    expect(brokenRate(1, 0)).toBeNull();
    expect(feedGramsPerBird(10, 0)).toBeNull();
  });

  it("does not hide inconsistent bird counts by clamping", () => {
    expect(activeBirds(100, 40)).toBe(60);
    expect(activeBirds(100, 130)).toBe(-30);
  });

  it("calculates grams of feed per bird", () => {
    expect(feedGramsPerBird(115, 1000)).toBeCloseTo(115);
  });

  it("reports changes in percentage points", () => {
    expect(pointsChange(0.849, 0.867)).toBe(-1.8);
    expect(pointsChange(0.9, 0.9)).toBe(0);
  });

  it("formats percentages and missing rates", () => {
    expect(formatPercent(0.849)).toBe("84.9");
    expect(formatPercent(null)).toBe("-");
  });
});

describe("dates", () => {
  it("uses Nigerian time, not the server's clock", () => {
    // 23:30 UTC on 2 Nov is already 00:30 on 3 Nov in Lagos (UTC+1).
    expect(todayIn("Africa/Lagos", new Date("2026-11-02T23:30:00Z"))).toBe("2026-11-03");
    expect(todayIn("UTC", new Date("2026-11-02T23:30:00Z"))).toBe("2026-11-02");
  });

  it("formats the device's local date", () => {
    expect(deviceToday(new Date(2026, 10, 3, 6, 5))).toBe("2026-11-03");
  });

  it("validates real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate("not a date")).toBe(false);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-11-01", "2026-11-03")).toBe(2);
    expect(daysBetween("2026-11-03", "2026-11-01")).toBe(-2);
  });

  it("describes age in days for chicks and weeks for older birds", () => {
    expect(formatAge(1)).toBe("1 day");
    expect(formatAge(10)).toBe("10 days");
    expect(formatAge(70)).toBe("10 weeks");
  });
});

describe("egg collection validation", () => {
  const schema = eggCollectionSchema(TODAY);
  const valid = { flockId: FLOCK, collectedOn: TODAY, eggs: 240, broken: 3 };

  it("accepts a normal entry", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("accepts zero eggs and zero broken", () => {
    expect(schema.safeParse({ ...valid, eggs: 0, broken: 0 }).success).toBe(true);
  });

  it("asks for the egg count when it is empty", () => {
    const r = schema.safeParse({ ...valid, eggs: null });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).eggs).toBe("Enter the number of eggs collected.");
  });

  it("rejects more broken eggs than collected", () => {
    const r = schema.safeParse({ ...valid, eggs: 10, broken: 11 });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).broken).toMatch(/cannot be more than/);
  });

  it("rejects fractions, negatives and absurd totals", () => {
    expect(schema.safeParse({ ...valid, eggs: 2.5 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, eggs: -1 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, eggs: 1_000_000 }).success).toBe(false);
  });

  it("rejects future dates but allows past ones", () => {
    expect(schema.safeParse({ ...valid, collectedOn: "2026-11-04" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, collectedOn: "2026-10-01" }).success).toBe(true);
  });

  it("requires a flock", () => {
    expect(schema.safeParse({ ...valid, flockId: "" }).success).toBe(false);
  });

  it("drops empty notes", () => {
    const r = schema.safeParse({ ...valid, notes: "   " });
    expect(r.success && r.data.notes).toBeUndefined();
  });
});

describe("mortality validation", () => {
  const schema = mortalitySchema(TODAY);
  const valid = { flockId: FLOCK, loggedOn: TODAY, kind: "death", birds: 2 };

  it("accepts deaths and culls", () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, kind: "cull" }).success).toBe(true);
  });

  it("requires at least one bird", () => {
    expect(schema.safeParse({ ...valid, birds: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, birds: null }).success).toBe(false);
  });

  it("rejects unknown kinds", () => {
    expect(schema.safeParse({ ...valid, kind: "stolen" }).success).toBe(false);
  });
});

describe("feed validation", () => {
  const schema = feedSchema(TODAY);
  const valid = { flockId: FLOCK, loggedOn: TODAY, feedType: "Layer mash", quantity: 2, unit: "bag" };

  it("accepts bags and kilograms, including halves", () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, quantity: 0.5 }).success).toBe(true);
    expect(schema.safeParse({ ...valid, unit: "kg", quantity: 37.5 }).success).toBe(true);
  });

  it("rejects zero quantity and a blank feed type", () => {
    expect(schema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, feedType: "  " }).success).toBe(false);
  });
});

describe("vaccination validation", () => {
  const schema = vaccinationSchema(TODAY);

  it("accepts a record linked to a schedule item", () => {
    const r = schema.safeParse({
      flockId: FLOCK,
      scheduleId: "00000000-0000-4000-8000-0000000b0002",
      vaccineName: "Infectious bronchitis",
      administeredOn: TODAY,
    });
    expect(r.success).toBe(true);
  });

  it("requires the vaccine name", () => {
    expect(schema.safeParse({ flockId: FLOCK, vaccineName: "", administeredOn: TODAY }).success).toBe(false);
  });
});

describe("flock validation", () => {
  const schema = flockSchema(TODAY);
  const valid = { name: "House 4", initialCount: 500, placedOn: "2026-10-01", placedAgeDays: 120 };

  it("accepts a new flock", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty name, no birds and a future placement", () => {
    expect(schema.safeParse({ ...valid, name: " " }).success).toBe(false);
    expect(schema.safeParse({ ...valid, initialCount: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, placedOn: "2026-12-01" }).success).toBe(false);
  });
});
