import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { InvoiceForm } from "@/components/owner/forms/invoice-form";
import { getCustomers, getPriceHistory } from "@/lib/farm";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const [customers, priceHistory] = await Promise.all([getCustomers(), getPriceHistory()]);
  return (
    <>
      <PageHeader eyebrow="Sales and money" title="New invoice" description="Choose the customer, add what they bought, and set when payment is due." />
      <InvoiceForm priceHistory={priceHistory} customers={customers.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
