import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/components/owner/forms/invoice-actions";
import { PaymentForm } from "@/components/owner/forms/commerce-forms";
import { InvoiceView } from "@/components/owner/views/invoice-view";
import { formatNgn } from "@/lib/domain/overview";
import { getInvoice, getToday } from "@/lib/farm";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const [today, data] = await Promise.all([getToday(), getInvoice(params.id)]);
  if (!data) notFound();
  const { invoice } = data;
  return (
    <>
      <InvoiceView
        {...data} today={today}
        actions={<InvoiceActions invoiceId={invoice.id} canVoid={invoice.status === "issued" && invoice.paidNgn === 0} />}
        paymentForm={<PaymentForm invoiceId={invoice.id} balanceHint={`${formatNgn(invoice.balanceNgn)} is still owed.`} />}
      />
    </>
  );
}
