import { describe, expect, it } from "vitest";
import { parseWith } from "./schemas";
import {
  customerSchema, eggAdjustmentSchema, expenseSchema, feedPurchaseSchema,
  invoiceSchema, invoiceTotal, paymentSchema, saleSchema,
} from "./commerce";

const today = "2026-11-04";
const uuid = "11111111-1111-4111-8111-111111111111";

describe("feed purchase", () => {
  it("converts bags to kilograms", () => {
    const r = parseWith(feedPurchaseSchema(today), { purchasedOn: today, feedType: "Layers mash", quantity: 40, unit: "bag", costNgn: 600000 });
    expect(r.ok && r.data.quantityKg).toBe(1000);
  });
  it("refuses a future date and a zero quantity", () => {
    const r = parseWith(feedPurchaseSchema(today), { purchasedOn: "2026-12-01", feedType: "x", quantity: 0, unit: "kg", costNgn: 1 });
    expect(!r.ok && r.errors).toMatchObject({ purchasedOn: expect.any(String), quantity: expect.any(String) });
  });
});

describe("egg adjustment", () => {
  it("signs the quantity by direction and demands a reason", () => {
    const ok = parseWith(eggAdjustmentSchema(today), { adjustedOn: today, grade: "large", direction: "remove", eggs: 30, reason: "Spoiled in storage" });
    expect(ok.ok && ok.data.signedEggs).toBe(-30);
    const bad = parseWith(eggAdjustmentSchema(today), { adjustedOn: today, grade: "large", direction: "add", eggs: 30, reason: " " });
    expect(!bad.ok && bad.errors.reason).toBeTruthy();
  });
});

describe("money records", () => {
  it("rejects zero and absurd amounts", () => {
    expect(parseWith(expenseSchema(today), { spentOn: today, category: "feed", amountNgn: 0 }).ok).toBe(false);
    expect(parseWith(expenseSchema(today), { spentOn: today, category: "feed", amountNgn: 5_000_000_000 }).ok).toBe(false);
    expect(parseWith(expenseSchema(today), { spentOn: today, category: "feed", amountNgn: 12500.5 }).ok).toBe(true);
  });
  it("needs a unit when a quantity is given", () => {
    const r = parseWith(saleSchema(today), { soldOn: today, category: "eggs", quantity: 5, amountNgn: 20000 });
    expect(!r.ok && r.errors.unit).toBeTruthy();
  });
  it("accepts a customer with just a name", () => {
    expect(parseWith(customerSchema, { name: "  Mama Tope  " }).ok).toBe(true);
    expect(parseWith(customerSchema, { name: "" }).ok).toBe(false);
  });
});

describe("invoice", () => {
  const line = { category: "eggs", description: "Large eggs", grade: "large", quantity: 10, unit: "crate", unitPriceNgn: 4500 };
  it("requires a line and a due date on or after the invoice date", () => {
    expect(parseWith(invoiceSchema(today), { customerId: uuid, issuedOn: today, dueOn: today, lines: [] }).ok).toBe(false);
    const r = parseWith(invoiceSchema(today), { customerId: uuid, issuedOn: today, dueOn: "2026-11-01", lines: [line] });
    expect(!r.ok && r.errors.dueOn).toBeTruthy();
    expect(parseWith(invoiceSchema(today), { customerId: uuid, issuedOn: today, dueOn: "2026-11-18", lines: [line] }).ok).toBe(true);
  });
  it("totals to the kobo", () => {
    expect(invoiceTotal([{ quantity: 10, unitPriceNgn: 4500 }, { quantity: 2.5, unitPriceNgn: 1999.99 }])).toBeCloseTo(49999.98 + 0.0, 1);
  });
});

describe("payment", () => {
  it("needs a positive amount and a method", () => {
    expect(parseWith(paymentSchema(today), { invoiceId: uuid, paidOn: today, amountNgn: 100, method: "cash" }).ok).toBe(true);
    expect(parseWith(paymentSchema(today), { invoiceId: uuid, paidOn: today, amountNgn: -5, method: "cash" }).ok).toBe(false);
  });
});
