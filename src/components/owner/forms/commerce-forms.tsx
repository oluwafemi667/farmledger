"use client";

import { RecordForm, num, str, type FieldSpec } from "./record-form";
import { todayIn } from "@/lib/domain/dates";
import {
  customerSchema, eggAdjustmentSchema, expenseSchema, feedPurchaseSchema, paymentSchema, saleSchema,
  EGG_GRADES, EXPENSE_CATEGORIES, PAYMENT_METHODS, SALE_CATEGORIES,
  expenseLabel, gradeLabel, methodLabel, saleLabel,
  type ActionResult,
} from "@/lib/domain/commerce";
import { parseWith } from "@/lib/domain/schemas";
import { recordEggAdjustment, recordFeedPurchase } from "@/app/(owner)/stock/actions";
import { addCustomer, recordExpense, recordPayment, recordSale } from "@/app/(owner)/sales/actions";

type Save = (raw: unknown) => Promise<ActionResult>;
const opts = <T extends string>(list: readonly T[], labels: Record<string, string>) =>
  list.map((v) => ({ value: v, label: labels[v] ?? v }));

// Every `save` can be replaced, so the demonstration page can run these forms
// without a database.

export function FeedPurchaseForm({ save = recordFeedPurchase, feedTypes = [] }: { save?: Save; feedTypes?: string[] }) {
  const fields: FieldSpec[] = [
    { name: "purchasedOn", label: "Date bought", kind: "date" },
    { name: "feedType", label: "Feed type", kind: "text", list: feedTypes, hint: "Use the same name the farmhands log, so stock lines up." },
    { name: "supplier", label: "Supplier", kind: "text", optional: true },
    { name: "quantity", label: "Quantity", kind: "number" },
    { name: "unit", label: "Unit", kind: "select", options: [{ value: "bag", label: "Bags (25 kg)" }, { value: "kg", label: "Kilograms" }] },
    { name: "costNgn", label: "Total paid (N)", kind: "money" },
  ];
  return (
    <RecordForm
      fields={fields}
      initial={{ purchasedOn: todayIn(), feedType: "", supplier: "", quantity: "", unit: "bag", costNgn: "" }}
      parse={(v) => parseWith(feedPurchaseSchema(todayIn()), { purchasedOn: v.purchasedOn, feedType: v.feedType, supplier: v.supplier, quantity: num(v.quantity), unit: v.unit, costNgn: num(v.costNgn) })}
      save={save}
      submitLabel="Record purchase"
      savedTitle="Purchase recorded"
    />
  );
}

export function EggAdjustmentForm({ save = recordEggAdjustment }: { save?: Save }) {
  const fields: FieldSpec[] = [
    { name: "adjustedOn", label: "Date", kind: "date" },
    { name: "grade", label: "Egg size", kind: "select", options: [...EGG_GRADES, "ungraded"].map((g) => ({ value: g, label: gradeLabel[g] })) },
    { name: "direction", label: "Change", kind: "select", options: [{ value: "add", label: "Add to stock" }, { value: "remove", label: "Remove from stock" }] },
    { name: "eggs", label: "Number of eggs", kind: "number", hint: "A crate is 30 eggs." },
    { name: "reason", label: "Reason", kind: "text", wide: true, hint: "For example opening stock, eggs eaten on the farm, spoiled." },
  ];
  return (
    <RecordForm
      fields={fields}
      initial={{ adjustedOn: todayIn(), grade: "ungraded", direction: "remove", eggs: "", reason: "" }}
      parse={(v) => parseWith(eggAdjustmentSchema(todayIn()), { adjustedOn: v.adjustedOn, grade: v.grade, direction: v.direction, eggs: num(v.eggs), reason: v.reason })}
      save={save}
      submitLabel="Record adjustment"
      savedTitle="Stock adjusted"
    />
  );
}

export function ExpenseForm({ save = recordExpense }: { save?: Save }) {
  const fields: FieldSpec[] = [
    { name: "spentOn", label: "Date", kind: "date" },
    { name: "category", label: "Category", kind: "select", options: opts(EXPENSE_CATEGORIES, expenseLabel) },
    { name: "amountNgn", label: "Amount (N)", kind: "money" },
    { name: "description", label: "What for", kind: "text", optional: true },
  ];
  return (
    <RecordForm
      fields={fields}
      initial={{ spentOn: todayIn(), category: "feed", amountNgn: "", description: "" }}
      parse={(v) => parseWith(expenseSchema(todayIn()), { spentOn: v.spentOn, category: v.category, amountNgn: num(v.amountNgn), description: v.description })}
      save={save}
      submitLabel="Record expense"
      savedTitle="Expense recorded"
    />
  );
}

export function SaleForm({ save = recordSale }: { save?: Save }) {
  const fields: FieldSpec[] = [
    { name: "soldOn", label: "Date", kind: "date" },
    { name: "category", label: "What was sold", kind: "select", options: opts(SALE_CATEGORIES, saleLabel) },
    { name: "grade", label: "Egg size", kind: "select", optional: true, options: opts(EGG_GRADES, gradeLabel), hint: "For egg sales, so stock stays right." },
    { name: "quantity", label: "Quantity", kind: "number", optional: true },
    { name: "unit", label: "Unit", kind: "text", optional: true, list: ["crate", "egg", "bird", "bag"] },
    { name: "amountNgn", label: "Amount received (N)", kind: "money" },
    { name: "buyer", label: "Buyer", kind: "text", optional: true },
    { name: "description", label: "Note", kind: "text", optional: true },
  ];
  return (
    <RecordForm
      fields={fields}
      initial={{ soldOn: todayIn(), category: "eggs", grade: "", quantity: "", unit: "crate", amountNgn: "", buyer: "", description: "" }}
      parse={(v) => parseWith(saleSchema(todayIn()), { soldOn: v.soldOn, category: v.category, grade: str(v.grade), quantity: num(v.quantity), unit: v.unit, amountNgn: num(v.amountNgn), buyer: v.buyer, description: v.description })}
      save={save}
      submitLabel="Record sale"
      savedTitle="Sale recorded"
    />
  );
}

export function CustomerForm({ save = addCustomer }: { save?: Save }) {
  const fields: FieldSpec[] = [
    { name: "name", label: "Customer name", kind: "text" },
    { name: "phone", label: "Phone", kind: "text", optional: true },
    { name: "address", label: "Address", kind: "text", optional: true, wide: true },
  ];
  return (
    <RecordForm
      fields={fields}
      initial={{ name: "", phone: "", address: "" }}
      parse={(v) => parseWith(customerSchema, { name: v.name, phone: v.phone, address: v.address })}
      save={save}
      submitLabel="Add customer"
      savedTitle="Customer added"
    />
  );
}

export function PaymentForm({ invoiceId, balanceHint, save = recordPayment }: { invoiceId: string; balanceHint?: string; save?: Save }) {
  const fields: FieldSpec[] = [
    { name: "paidOn", label: "Date received", kind: "date" },
    { name: "amountNgn", label: "Amount (N)", kind: "money", hint: balanceHint },
    { name: "method", label: "How it was paid", kind: "select", options: opts(PAYMENT_METHODS, methodLabel) },
    { name: "reference", label: "Reference", kind: "text", optional: true },
  ];
  return (
    <RecordForm
      fields={fields}
      initial={{ paidOn: todayIn(), amountNgn: "", method: "transfer", reference: "" }}
      parse={(v) => parseWith(paymentSchema(todayIn()), { invoiceId, paidOn: v.paidOn, amountNgn: num(v.amountNgn), method: v.method, reference: v.reference })}
      save={save}
      submitLabel="Record payment"
      savedTitle="Payment recorded"
    />
  );
}
