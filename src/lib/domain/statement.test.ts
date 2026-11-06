import { describe, expect, it } from "vitest";
import { buildStatement, lastPrice } from "./statement";

const inv = (id: string, number: string, issuedOn: string, totalNgn: number, status: "issued" | "void" = "issued") => ({ id, number, issuedOn, dueOn: "2026-12-01", totalNgn, status });
const pay = (id: string, invoiceId: string, paidOn: string, amountNgn: number) => ({ id, invoiceId, paidOn, amountNgn, method: "transfer", reference: null });

describe("buildStatement", () => {
  it("keeps a running balance", () => {
    const s = buildStatement([inv("1", "INV-1", "2026-10-01", 1000), inv("2", "INV-2", "2026-10-10", 500)], [pay("a", "1", "2026-10-05", 400)]);
    expect(s.lines.map((l) => l.balanceNgn)).toEqual([1000, 600, 1100]);
    expect(s.balanceNgn).toBe(1100);
    expect(s.billedNgn).toBe(1500);
    expect(s.paidNgn).toBe(400);
  });
  it("ignores void invoices and their payments", () => {
    const s = buildStatement([inv("1", "INV-1", "2026-10-01", 1000, "void"), inv("2", "INV-2", "2026-10-02", 200)], [pay("a", "1", "2026-10-03", 1000)]);
    expect(s.lines).toHaveLength(1);
    expect(s.balanceNgn).toBe(200);
  });
  it("puts an invoice before a payment on the same day", () => {
    const s = buildStatement([inv("1", "INV-1", "2026-10-01", 100)], [pay("a", "1", "2026-10-01", 100)]);
    expect(s.lines.map((l) => l.kind)).toEqual(["invoice", "payment"]);
    expect(s.balanceNgn).toBe(0);
  });
  it("is empty with no activity", () => expect(buildStatement([], []).balanceNgn).toBe(0));
});

describe("lastPrice", () => {
  const h = [
    { customerId: "c", category: "eggs", grade: "large", unit: "crate", unitPriceNgn: 4000, issuedOn: "2026-09-01" },
    { customerId: "c", category: "eggs", grade: "large", unit: "Crate", unitPriceNgn: 4300, issuedOn: "2026-10-01" },
    { customerId: "d", category: "eggs", grade: "large", unit: "crate", unitPriceNgn: 9999, issuedOn: "2026-10-05" },
  ];
  it("returns the most recent price for that customer and item", () => {
    expect(lastPrice(h, { customerId: "c", category: "eggs", grade: "large", unit: "crate" })?.unitPriceNgn).toBe(4300);
  });
  it("returns null for a different size", () => {
    expect(lastPrice(h, { customerId: "c", category: "eggs", grade: "small", unit: "crate" })).toBeNull();
  });
});
