import { describe, expect, it } from "vitest";
import { ageing, invoiceState } from "./receivables";
import { describeAudit } from "./audit";

const today = "2026-11-04";
const inv = (dueOn: string, balanceNgn: number, status: "issued" | "void" = "issued") => ({ status, dueOn, balanceNgn, totalNgn: 1000 });

describe("invoiceState", () => {
  it("separates void, paid, overdue and open", () => {
    expect(invoiceState(inv("2026-11-01", 0, "void"), today)).toBe("void");
    expect(invoiceState(inv("2026-11-01", 0), today)).toBe("paid");
    expect(invoiceState(inv("2026-11-03", 500), today)).toBe("overdue");
    expect(invoiceState(inv("2026-11-04", 500), today)).toBe("open");
  });
});

describe("ageing", () => {
  it("buckets balances by days late and ignores paid and void", () => {
    const b = ageing([inv("2026-11-10", 100), inv("2026-10-20", 200), inv("2026-09-20", 300), inv("2026-08-01", 400), inv("2026-08-01", 0), inv("2026-08-01", 999, "void")], today);
    expect(b.map((x) => x.ngn)).toEqual([100, 200, 300, 400]);
    expect(b.map((x) => x.count)).toEqual([1, 1, 1, 1]);
  });
});

describe("describeAudit", () => {
  it("reads an update as old to new and hides plumbing columns", () => {
    const d = describeAudit({ table: "flocks", action: "update", changes: { house: { old: "House 1", new: "House 9" }, version: { old: 1, new: 2 } } });
    expect(d).toEqual({ title: "Flock changed", detail: "house: House 1 to House 9" });
  });
  it("names what was added or deleted", () => {
    expect(describeAudit({ table: "customers", action: "insert", changes: { name: "Mama Tope" } })).toEqual({ title: "Customer added", detail: "Mama Tope" });
    expect(describeAudit({ table: "expenses", action: "delete", changes: { description: "Diesel", amount_ngn: 50000 } }).detail).toBe("Diesel, N 50,000");
  });
});
