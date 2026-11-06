import { describe, expect, it } from "vitest";
import { buildBriefing } from "./briefing";
import { toCsv } from "./csv";
import type { FarmDay, MoneyDay } from "./overview";

const day = (i: number, eggs: number, deaths = 0): FarmDay => ({ day: `2026-10-${String(i + 1).padStart(2, "0")}`, birds: 1000, eggs, broken: 0, deaths, feedKg: 110 });
const flat = (eggs: number, n = 14) => Array.from({ length: n }, (_, i) => day(i, eggs));
const base = { money: [] as MoneyDay[], alerts: [], overdueInvoices: { count: 0, totalNgn: 0 }, lowFeedTypes: [] };

describe("buildBriefing", () => {
  it("flags a fall in laying rate", () => {
    const days = [...flat(850, 7), ...flat(780, 7)];
    const b = buildBriefing({ ...base, days });
    expect(b.lines[0].tone).toBe("attention");
  });
  it("says so when there is no data", () => {
    expect(buildBriefing({ ...base, days: flat(0) }).lines[0].tone).toBe("watch");
  });
  it("reports overdue invoices and low feed", () => {
    const b = buildBriefing({ ...base, days: flat(850), overdueInvoices: { count: 2, totalNgn: 500000 }, lowFeedTypes: ["Layer mash"] });
    expect(b.lines.map((l) => l.text).join(" ")).toMatch(/2 invoices are overdue/);
    expect(b.lines.map((l) => l.text).join(" ")).toMatch(/Layer mash/);
  });
  it("reports a loss", () => {
    const money: MoneyDay[] = [{ day: "2026-10-01", salesNgn: 100, invoicedNgn: 0, collectedNgn: 0, expensesNgn: 900 }];
    expect(buildBriefing({ ...base, days: flat(850), money }).lines.some((l) => /loss/.test(l.text))).toBe(true);
  });
});

describe("toCsv", () => {
  it("quotes commas and quotes", () => {
    expect(toCsv(["a"], [['x, "y"']])).toBe('a\r\n"x, ""y"""\r\n');
  });
  it("neutralises formulas", () => {
    expect(toCsv(["a"], [["=1+1"]])).toBe("a\r\n'=1+1\r\n");
  });
  it("keeps negative numbers", () => {
    expect(toCsv(["a"], [[-5]])).toBe("a\r\n-5\r\n");
  });
});
