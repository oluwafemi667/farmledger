"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import {
  customerSchema, expenseSchema, invoiceSchema, paymentSchema, saleSchema,
  type ActionResult,
} from "@/lib/domain/commerce";
import { ownerAction } from "@/lib/data/owner-action";
import { createClient } from "@/lib/supabase/server";

const refresh = () => { revalidatePath("/sales", "layout"); revalidatePath("/overview"); };

export async function recordExpense(raw: unknown): Promise<ActionResult> {
  const r = await ownerAction(expenseSchema, raw, async (db, v, farmId) => ({
    error: (await db.from("expenses").insert({
      farm_id: farmId, spent_on: v.spentOn, category: v.category,
      description: v.description ?? null, amount_ngn: v.amountNgn, notes: v.notes ?? null,
    })).error,
  }));
  if (r.status === "saved") refresh();
  return r;
}

export async function recordSale(raw: unknown): Promise<ActionResult> {
  const r = await ownerAction(saleSchema, raw, async (db, v, farmId) => ({
    error: (await db.from("sales").insert({
      farm_id: farmId, sold_on: v.soldOn, category: v.category, description: v.description ?? null,
      quantity: v.quantity ?? null, unit: v.unit ?? null, grade: v.grade ?? null,
      amount_ngn: v.amountNgn, buyer: v.buyer ?? null,
    })).error,
  }));
  if (r.status === "saved") refresh();
  return r;
}

export async function addCustomer(raw: unknown): Promise<ActionResult> {
  const r = await ownerAction(() => customerSchema, raw, async (db, v, farmId) => ({
    error: (await db.from("customers").insert({
      farm_id: farmId, name: v.name, phone: v.phone ?? null, address: v.address ?? null, notes: v.notes ?? null,
    })).error,
  }), { duplicate: "You already have a customer with this name." });
  if (r.status === "saved") refresh();
  return r;
}

export async function createInvoice(raw: unknown): Promise<ActionResult> {
  const r = await ownerAction(invoiceSchema, raw, async (db, v) => {
    const { data, error } = await db.rpc("create_invoice", {
      p_customer: v.customerId, p_issued_on: v.issuedOn, p_due_on: v.dueOn, p_notes: v.notes ?? "",
      p_items: v.lines.map((l) => ({
        category: l.category, description: l.description, grade: l.grade ?? "",
        quantity: l.quantity, unit: l.unit, unit_price_ngn: l.unitPriceNgn,
      })),
    });
    return { error, id: data as string | undefined };
  });
  if (r.status === "saved") refresh();
  return r;
}

export async function recordPayment(raw: unknown): Promise<ActionResult> {
  const r = await ownerAction(paymentSchema, raw, async (db, v) => ({
    error: (await db.rpc("record_payment", {
      p_invoice: v.invoiceId, p_paid_on: v.paidOn, p_amount: v.amountNgn,
      p_method: v.method, p_reference: v.reference ?? "",
    })).error,
  }));
  if (r.status === "saved") refresh();
  return r;
}

export async function voidInvoice(invoiceId: string): Promise<ActionResult> {
  await requireProfile("owner");
  if (!z.string().uuid().safeParse(invoiceId).success) return { status: "failed", message: "This invoice could not be identified." };
  const { error } = await createClient().rpc("void_invoice", { p_invoice: invoiceId });
  if (error) {
    return error.code === "22023"
      ? { status: "invalid", errors: { form: error.message } }
      : { status: "failed", message: "The server could not void this invoice. Try again." };
  }
  refresh();
  return { status: "saved" };
}
