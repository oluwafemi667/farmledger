import Link from "next/link";
import { FilePlus2, Users, Wallet } from "lucide-react";
import { DataTable, EmptyState, LinkButton, PageHeader, SectionHeading, StatusChip, type Column } from "@/components/ui";
import { formatShortDate } from "@/lib/domain/dates";
import { formatNgn } from "@/lib/domain/overview";
import { ageing, daysLate, invoiceState } from "@/lib/domain/receivables";
import type { InvoiceRow } from "@/lib/farm";

export function InvoiceStateChip({ inv, today }: { inv: InvoiceRow; today: string }) {
  const s = invoiceState(inv, today);
  if (s === "void") return <StatusChip tone="neutral">Void</StatusChip>;
  if (s === "paid") return <StatusChip tone="positive">Paid</StatusChip>;
  if (s === "overdue") return <StatusChip tone="attention">{daysLate(inv, today)} days late</StatusChip>;
  return <StatusChip tone="neutral">Due {formatShortDate(inv.dueOn)}</StatusChip>;
}

export const invoiceColumns = (today: string): Column<InvoiceRow>[] => [
  { key: "n", header: "Invoice", className: "whitespace-nowrap", render: (r) => <Link href={`/sales/invoices/${r.id}`} className="font-medium underline-offset-4 hover:underline">{r.number}</Link> },
  { key: "c", header: "Customer", render: (r) => r.customerName },
  { key: "i", header: "Issued", hideOnMobile: true, className: "whitespace-nowrap", render: (r) => formatShortDate(r.issuedOn) },
  { key: "t", header: "Total", numeric: true, hideOnMobile: true, render: (r) => formatNgn(r.totalNgn) },
  { key: "b", header: "Owed", numeric: true, render: (r) => (r.status === "void" ? "-" : formatNgn(r.balanceNgn)) },
  { key: "s", header: "Status", render: (r) => <InvoiceStateChip inv={r} today={today} /> },
];

export function SalesView({ invoices, today }: { invoices: InvoiceRow[]; today: string }) {
  const open = invoices.filter((i) => invoiceState(i, today) === "open" || invoiceState(i, today) === "overdue")
    .sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1));
  const buckets = ageing(invoices, today);
  const owed = buckets.reduce((s, b) => s + b.ngn, 0);
  const cols = invoiceColumns(today);

  return (
    <>
      <PageHeader
        eyebrow="Sales and money"
        title="Who owes you"
        description="Invoices to customers, payments received, and cash sales and expenses."
        actions={<LinkButton href="/sales/invoices/new"><FilePlus2 className="h-4 w-4" aria-hidden /> New invoice</LinkButton>}
      />
      <nav aria-label="Sales sections" className="-mt-4 flex flex-wrap gap-3">
        <LinkButton href="/sales/customers" variant="secondary"><Users className="h-4 w-4" aria-hidden /> Customers</LinkButton>
        <LinkButton href="/sales/ledger" variant="secondary"><Wallet className="h-4 w-4" aria-hidden /> Cash sales and expenses</LinkButton>
      </nav>

      <section className="flex flex-col gap-6">
        <SectionHeading title="Receivables" description="Unpaid balances on issued invoices, by how late they are." />
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-5">
          <div className="rule-t col-span-2 flex flex-col gap-1 pt-3 lg:col-span-1">
            <p className="eyebrow">Total owed</p>
            <p className="figure text-3xl font-medium leading-none">{formatNgn(owed, true)}</p>
            <p className="text-sm text-stone-600">{open.length} open {open.length === 1 ? "invoice" : "invoices"}</p>
          </div>
          {buckets.map((b) => (
            <div key={b.key} className="rule-t flex flex-col gap-1 pt-3">
              <p className="eyebrow">{b.label}</p>
              <p className={`figure text-2xl font-medium leading-none ${b.key !== "current" && b.ngn > 0 ? "text-attention-600" : ""}`}>{formatNgn(b.ngn, true)}</p>
              <p className="text-sm text-stone-600">{b.count} {b.count === 1 ? "invoice" : "invoices"}</p>
            </div>
          ))}
        </div>
        <DataTable caption="Open invoices" columns={cols} rows={open} rowKey={(r) => r.id}
          empty={<p className="text-stone-700">Nothing is owed. Every issued invoice is paid.</p>} />
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading title="All invoices" />
        {invoices.length === 0 ? (
          <EmptyState icon={FilePlus2} title="No invoices yet" description="Add a customer, then create the first invoice." action={<LinkButton href="/sales/invoices/new">New invoice</LinkButton>} />
        ) : (
          <DataTable caption="All invoices" columns={cols} rows={invoices} rowKey={(r) => r.id} />
        )}
      </section>
    </>
  );
}
