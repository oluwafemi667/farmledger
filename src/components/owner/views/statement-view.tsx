import { DataTable, PageHeader, StatusChip, type Column } from "@/components/ui";
import type { ReactNode } from "react";
import { formatShortDate } from "@/lib/domain/dates";
import { formatNgn } from "@/lib/domain/overview";
import type { Statement, StatementLine } from "@/lib/domain/statement";
import type { CustomerRow } from "@/lib/farm";

const cols: Column<StatementLine>[] = [
  { key: "d", header: "Date", className: "whitespace-nowrap", render: (r) => formatShortDate(r.day) },
  { key: "l", header: "Entry", render: (r) => <span className="flex flex-col"><span className="font-medium">{r.label}</span>{r.detail ? <span className="text-xs capitalize text-stone-600">{r.detail}</span> : null}</span> },
  { key: "c", header: "Billed", numeric: true, hideOnMobile: true, render: (r) => (r.chargeNgn ? formatNgn(r.chargeNgn) : <span className="text-stone-500">-</span>) },
  { key: "p", header: "Paid", numeric: true, hideOnMobile: true, render: (r) => (r.creditNgn ? formatNgn(r.creditNgn) : <span className="text-stone-500">-</span>) },
  { key: "b", header: "Balance", numeric: true, render: (r) => formatNgn(r.balanceNgn) },
];

/** A customer's account: printable, and the page you send when you are chasing a payment. */
export function StatementView({ customer, statement, farmName, today, actions }: { customer: CustomerRow; statement: Statement; farmName?: string; today: string; actions: ReactNode }) {
  return (
    <>
      <PageHeader eyebrow={`Statement of account${farmName ? `, ${farmName}` : ""}`} title={customer.name}
        description={[customer.phone, customer.address].filter(Boolean).join(" / ") || `As at ${formatShortDate(today)}`} actions={actions} />
      <section className="grid grid-cols-3 gap-x-8">
        {[["Billed", statement.billedNgn], ["Paid", statement.paidNgn], ["Owes you", statement.balanceNgn]].map(([l, v]) => (
          <div key={l as string} className="rule-t flex flex-col gap-1 pt-3">
            <p className="eyebrow">{l as string}</p>
            <p className="figure text-xl font-medium leading-none md:text-3xl">{formatNgn(v as number, true)}</p>
          </div>
        ))}
      </section>
      {statement.balanceNgn === 0 && statement.lines.length > 0 ? <div><StatusChip tone="positive">Account settled</StatusChip></div> : null}
      <DataTable caption={`Account of ${customer.name}`} columns={cols} rows={statement.lines} rowKey={(r) => r.key} empty={<p className="text-stone-700">No invoices for this customer yet.</p>} />
      <p className="hidden text-xs text-stone-600 print:block">All amounts are in naira. Printed {formatShortDate(today)}.</p>
    </>
  );
}
