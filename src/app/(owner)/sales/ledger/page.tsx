import type { Metadata } from "next";
import { ExpenseForm, SaleForm } from "@/components/owner/forms/commerce-forms";
import { LedgerView } from "@/components/owner/views/ledger-view";
import { addDays } from "@/lib/domain/dates";
import { getLedger, getToday } from "@/lib/farm";

export const metadata: Metadata = { title: "Cash sales and expenses" };

export default async function LedgerPage() {
  const today = await getToday();
  const entries = await getLedger(addDays(today, -59));
  return <LedgerView entries={entries} saleForm={<SaleForm />} expenseForm={<ExpenseForm />} />;
}
