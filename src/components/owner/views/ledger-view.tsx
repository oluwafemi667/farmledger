import type { ReactNode } from "react";
import { OpenOnHash } from "@/components/open-on-hash";
import { DataTable, PageHeader, SectionHeading, StatusChip, type Column } from "@/components/ui";
import { formatShortDate } from "@/lib/domain/dates";
import { formatNgn } from "@/lib/domain/overview";
import type { CustomerRow, InvoiceRow, LedgerEntry } from "@/lib/farm";

const cols: Column<LedgerEntry>[] = [
  { key: "d", header: "Date", className: "whitespace-nowrap", render: (r) => formatShortDate(r.day) },
  { key: "k", header: "Type", render: (r) => <StatusChip tone={r.kind === "sale" ? "positive" : "neutral"}>{r.kind === "sale" ? "Money in" : "Money out"}</StatusChip> },
  { key: "l", header: "For", render: (r) => <span className="flex flex-col"><span className="font-medium capitalize">{r.label}</span>{r.detail ? <span className="text-xs text-stone-600">{r.detail}</span> : null}</span> },
  { key: "a", header: "Amount", numeric: true, render: (r) => formatNgn(r.amountNgn) },
];

export function LedgerView({ entries, saleForm, expenseForm }: { entries: LedgerEntry[]; saleForm: ReactNode; expenseForm: ReactNode }) {
  const inn = entries.filter((e) => e.kind === "sale").reduce((s, e) => s + e.amountNgn, 0);
  const out = entries.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amountNgn, 0);
  return (
    <>
      <OpenOnHash />
      <PageHeader eyebrow="Sales and money" title="Cash sales and expenses" description="Walk-in sales that were paid on the spot, and everything the farm spent. Invoices to customers are on the Sales page." />
      <section className="grid grid-cols-2 gap-x-8 md:grid-cols-3">
        {[["Money in, 60 days", inn], ["Money out, 60 days", out], ["Net", inn - out]].map(([l, v]) => (
          <div key={l as string} className="rule-t flex flex-col gap-1 pt-3">
            <p className="eyebrow">{l as string}</p>
            <p className={`figure text-2xl font-medium leading-none md:text-3xl ${(v as number) < 0 ? "text-attention-600" : ""}`}>{formatNgn(v as number, true)}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-12 lg:grid-cols-2">
        <section id="new-sale" className="flex scroll-mt-6 flex-col gap-4"><SectionHeading title="Record a cash sale" />{saleForm}</section>
        <section id="new-expense" className="flex scroll-mt-6 flex-col gap-4"><SectionHeading title="Record an expense" />{expenseForm}</section>
      </div>
      <section className="flex flex-col gap-4">
        <SectionHeading title="Last 60 days" />
        <DataTable caption="Cash sales and expenses" columns={cols} rows={entries} rowKey={(r) => `${r.kind}-${r.id}`} empty={<p className="text-stone-700">Nothing recorded in this period.</p>} />
      </section>
    </>
  );
}

export function CustomersView({ customers, invoices, form }: { customers: CustomerRow[]; invoices: InvoiceRow[]; form: ReactNode }) {
  const owed = new Map<string, number>();
  for (const i of invoices) if (i.status === "issued") owed.set(i.customerId, (owed.get(i.customerId) ?? 0) + i.balanceNgn);
  const rows = customers.map((c) => ({ ...c, owed: owed.get(c.id) ?? 0 }));
  const c2: Column<(typeof rows)[number]>[] = [
    { key: "n", header: "Customer", render: (r) => <a href={`/sales/customers/${r.id}`} className="font-medium underline-offset-4 hover:underline">{r.name}</a> },
    { key: "p", header: "Phone", hideOnMobile: true, render: (r) => r.phone ?? <span className="text-stone-500">-</span> },
    { key: "a", header: "Address", hideOnMobile: true, render: (r) => r.address ?? <span className="text-stone-500">-</span> },
    { key: "o", header: "Owes you", numeric: true, render: (r) => (r.owed > 0 ? formatNgn(r.owed) : <span className="text-stone-500">-</span>) },
  ];
  return (
    <>
      <OpenOnHash />
      <PageHeader eyebrow="Sales and money" title="Customers" description="People and businesses you invoice." />
      <DataTable caption="Customers" columns={c2} rows={rows} rowKey={(r) => r.id} empty={<p className="text-stone-700">No customers yet. Add the first one below.</p>} />
      <section id="new-customer" className="flex scroll-mt-6 flex-col gap-4"><SectionHeading title="Add a customer" />{form}</section>
    </>
  );
}
