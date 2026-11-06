import { daysBetween } from "./dates";

export interface InvoiceLike {
  status: "issued" | "void";
  dueOn: string;
  balanceNgn: number;
  totalNgn: number;
}

export type InvoiceState = "void" | "paid" | "overdue" | "open";

export function invoiceState(inv: InvoiceLike, today: string): InvoiceState {
  if (inv.status === "void") return "void";
  if (inv.balanceNgn <= 0) return "paid";
  return inv.dueOn < today ? "overdue" : "open";
}

export interface AgeingBucket {
  key: "current" | "d1_30" | "d31_60" | "d61_plus";
  label: string;
  ngn: number;
  count: number;
}

/** What is owed, grouped by how long it has been past due. */
export function ageing(invoices: InvoiceLike[], today: string): AgeingBucket[] {
  const b: AgeingBucket[] = [
    { key: "current", label: "Not yet due", ngn: 0, count: 0 },
    { key: "d1_30", label: "1 to 30 days late", ngn: 0, count: 0 },
    { key: "d31_60", label: "31 to 60 days late", ngn: 0, count: 0 },
    { key: "d61_plus", label: "Over 60 days late", ngn: 0, count: 0 },
  ];
  for (const inv of invoices) {
    if (invoiceState(inv, today) === "void" || inv.balanceNgn <= 0) continue;
    const late = daysBetween(inv.dueOn, today);
    const i = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : 3;
    b[i].ngn += inv.balanceNgn;
    b[i].count += 1;
  }
  return b;
}

export function daysLate(inv: InvoiceLike, today: string): number {
  return Math.max(0, daysBetween(inv.dueOn, today));
}
