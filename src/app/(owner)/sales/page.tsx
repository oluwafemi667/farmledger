import type { Metadata } from "next";
import { SalesView } from "@/components/owner/views/sales-view";
import { getInvoices, getToday } from "@/lib/farm";

export const metadata: Metadata = { title: "Sales and money" };

export default async function SalesPage() {
  const today = await getToday();
  return <SalesView invoices={await getInvoices()} today={today} />;
}
