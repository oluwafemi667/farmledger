"use server";

import { revalidatePath } from "next/cache";
import { eggAdjustmentSchema, feedPurchaseSchema, type ActionResult } from "@/lib/domain/commerce";
import { ownerAction } from "@/lib/data/owner-action";

export async function recordFeedPurchase(raw: unknown): Promise<ActionResult> {
  const r = await ownerAction(feedPurchaseSchema, raw, async (db, v, farmId) => {
    const { error } = await db.from("feed_purchases").insert({
      farm_id: farmId, purchased_on: v.purchasedOn, feed_type: v.feedType,
      supplier: v.supplier ?? null, quantity_kg: v.quantityKg, cost_ngn: v.costNgn,
    });
    return { error };
  });
  if (r.status === "saved") { revalidatePath("/stock"); revalidatePath("/overview"); }
  return r;
}

export async function recordEggAdjustment(raw: unknown): Promise<ActionResult> {
  const r = await ownerAction(eggAdjustmentSchema, raw, async (db, v, farmId) => {
    const { error } = await db.from("egg_stock_adjustments").insert({
      farm_id: farmId, adjusted_on: v.adjustedOn, grade: v.grade === "ungraded" ? null : v.grade,
      eggs: v.signedEggs, reason: v.reason,
    });
    return { error };
  });
  if (r.status === "saved") revalidatePath("/stock");
  return r;
}
