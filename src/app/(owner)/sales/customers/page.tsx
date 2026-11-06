import type { Metadata } from "next";
import { CustomerForm } from "@/components/owner/forms/commerce-forms";
import { CustomersView } from "@/components/owner/views/ledger-view";
import { getCustomers, getInvoices } from "@/lib/farm";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const [customers, invoices] = await Promise.all([getCustomers(), getInvoices(500)]);
  return <CustomersView customers={customers} invoices={invoices} form={<CustomerForm />} />;
}
