import type { ReactNode } from "react";
import { DataTable, PageHeader, SectionHeading, type Column } from "@/components/ui";
import { gradeLabel, methodLabel, saleLabel } from "@/lib/domain/commerce";
import { formatShortDate } from "@/lib/domain/dates";
import { formatNgn } from "@/lib/domain/overview";
import { invoiceState } from "@/lib/domain/receivables";
import type { InvoiceLine, InvoiceRow, PaymentRow } from "@/lib/farm";
import { InvoiceStateChip } from "./sales-view";

const lineCols: Column<InvoiceLine>[] = [
  { key: "d", header: "Item", render: (r) => (
    <span className="flex flex-col"><span className="font-medium">{r.description}</span>
      <span className="text-xs text-stone-600">{saleLabel[r.category as keyof typeof saleLabel] ?? r.category}{r.grade ? `, ${gradeLabel[r.grade] ?? r.grade}` : ""}</span></span>
  ) },
  { key: "q", header: "Quantity", numeric: true, render: (r) => `${r.quantity.toLocaleString("en-NG")} ${r.unit}` },
  { key: "p", header: "Price", numeric: true, hideOnMobile: true, render: (r) => formatNgn(r.unitPriceNgn) },
  { key: "t", header: "Total", numeric: true, render: (r) => formatNgn(r.lineTotalNgn) },
];
const payCols: Column<PaymentRow>[] = [
  { key: "d", header: "Received", className: "whitespace-nowrap", render: (r) => formatShortDate(r.paidOn) },
  { key: "m", header: "How", render: (r) => methodLabel[r.method as keyof typeof methodLabel] ?? r.method },
  { key: "r", header: "Reference", hideOnMobile: true, render: (r) => r.reference ?? <span className="text-stone-500">-</span> },
  { key: "a", header: "Amount", numeric: true, render: (r) => formatNgn(r.amountNgn) },
];

export function InvoiceView({
  invoice, lines, payments, notes, today, paymentForm, actions,
}: {
  invoice: InvoiceRow; lines: InvoiceLine[]; payments: PaymentRow[]; notes: string | null; today: string;
  paymentForm: ReactNode; actions: ReactNode;
}) {
  const state = invoiceState(invoice, today);
  return (
    <>
      <PageHeader eyebrow="Invoice" title={`${invoice.number}, ${invoice.customerName}`}
        description={`Issued ${formatShortDate(invoice.issuedOn)}, due ${formatShortDate(invoice.dueOn)}.`} actions={actions} />
      <div className="-mt-4"><InvoiceStateChip inv={invoice} today={today} /></div>

      <section className="grid grid-cols-3 gap-x-8">
        {[["Total", invoice.totalNgn], ["Paid", invoice.paidNgn], ["Owed", state === "void" ? 0 : invoice.balanceNgn]].map(([l, v]) => (
          <div key={l as string} className="rule-t flex flex-col gap-1 pt-3">
            <p className="eyebrow">{l as string}</p>
            <p className="figure text-xl font-medium leading-none md:text-3xl">{formatNgn(v as number, true)}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Lines" />
        <DataTable caption="Invoice lines" columns={lineCols} rows={lines} rowKey={(r) => r.id} />
        {notes ? <p className="text-stone-700">Note: {notes}</p> : null}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Payments" />
        <DataTable caption="Payments" columns={payCols} rows={payments} rowKey={(r) => r.id} empty={<p className="text-stone-700">No payments yet.</p>} />
      </section>

      {state === "open" || state === "overdue" ? (
        <section className="flex flex-col gap-4 print:hidden">
          <SectionHeading title="Record a payment" />
          {paymentForm}
        </section>
      ) : null}
    </>
  );
}
