import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { InvoiceActions } from "@/components/owner/forms/invoice-actions";
import { StatementView } from "@/components/owner/views/statement-view";
import { LinkButton } from "@/components/ui";
import { buildStatement } from "@/lib/domain/statement";
import { getCustomer, getCustomerAccount, getFarm, getToday } from "@/lib/farm";

export const metadata: Metadata = { title: "Customer statement" };

export default async function CustomerStatementPage({ params }: { params: { id: string } }) {
  const [customer, account, farm, today] = await Promise.all([getCustomer(params.id), getCustomerAccount(params.id), getFarm(), getToday()]);
  if (!customer) notFound();
  const statement = buildStatement(
    account.invoices.map((i) => ({ id: i.id, number: i.number, issuedOn: i.issuedOn, dueOn: i.dueOn, totalNgn: i.totalNgn, status: i.status })),
    account.payments,
  );
  return (
    <StatementView customer={customer} statement={statement} farmName={farm?.name} today={today}
      actions={<><InvoiceActions invoiceId="" canVoid={false} /><LinkButton href="/sales/invoices/new" variant="primary"><Plus className="h-4 w-4" aria-hidden /> New invoice</LinkButton></>} />
  );
}
