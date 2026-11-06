export interface StatementInvoice { id: string; number: string; issuedOn: string; dueOn: string; totalNgn: number; status: "issued" | "void" }
export interface StatementPayment { id: string; invoiceId: string; paidOn: string; amountNgn: number; method: string; reference: string | null }

export interface StatementLine {
  key: string;
  day: string;
  kind: "invoice" | "payment";
  label: string;
  detail: string | null;
  /** Added to what the customer owes. */
  chargeNgn: number;
  /** Taken off what the customer owes. */
  creditNgn: number;
  balanceNgn: number;
}

export interface Statement { lines: StatementLine[]; balanceNgn: number; billedNgn: number; paidNgn: number }

/**
 * A running account for one customer: every invoice adds to what is owed and
 * every payment takes it off. Void invoices never count, and neither do payments
 * recorded against them. Same-day items list invoices before payments.
 */
export function buildStatement(invoices: StatementInvoice[], payments: StatementPayment[]): Statement {
  const live = invoices.filter((i) => i.status === "issued");
  const byId = new Map(live.map((i) => [i.id, i]));
  const raw = [
    ...live.map((i) => ({ key: `i${i.id}`, day: i.issuedOn, order: 0, kind: "invoice" as const, label: `Invoice ${i.number}`, detail: `Due ${i.dueOn}`, charge: i.totalNgn, credit: 0 })),
    ...payments.filter((p) => byId.has(p.invoiceId)).map((p) => ({
      key: `p${p.id}`, day: p.paidOn, order: 1, kind: "payment" as const,
      label: `Payment for ${byId.get(p.invoiceId)!.number}`, detail: [p.method, p.reference].filter(Boolean).join(", ") || null, charge: 0, credit: p.amountNgn,
    })),
  ].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.order - b.order));

  let balance = 0;
  const lines = raw.map((r) => {
    balance = Math.round((balance + r.charge - r.credit) * 100) / 100;
    return { key: r.key, day: r.day, kind: r.kind, label: r.label, detail: r.detail, chargeNgn: r.charge, creditNgn: r.credit, balanceNgn: balance };
  });
  return {
    lines,
    balanceNgn: balance,
    billedNgn: raw.reduce((s, r) => s + r.charge, 0),
    paidNgn: raw.reduce((s, r) => s + r.credit, 0),
  };
}

export interface PriceHistoryRow { customerId: string; category: string; grade: string | null; unit: string; unitPriceNgn: number; issuedOn: string }

/** What this customer was last charged for the same kind of item, if ever. */
export function lastPrice(history: PriceHistoryRow[], q: { customerId: string; category: string; grade: string | null; unit: string }): PriceHistoryRow | null {
  const hits = history.filter(
    (h) => h.customerId === q.customerId && h.category === q.category && (h.grade ?? "") === (q.grade ?? "") && h.unit.trim().toLowerCase() === q.unit.trim().toLowerCase(),
  );
  return hits.sort((a, b) => (a.issuedOn < b.issuedOn ? 1 : -1))[0] ?? null;
}
