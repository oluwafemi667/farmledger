"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { getToday } from "@/lib/farm";
import { flockSchema, parseWith, type FlockInput } from "@/lib/domain/schemas";
import { createClient } from "@/lib/supabase/server";

export type UpdateFlockResult =
  | { status: "saved" }
  /** Someone else changed the flock after this form was loaded. */
  | { status: "conflict"; message: string }
  | { status: "invalid"; errors: Record<string, string> }
  | { status: "failed"; message: string };

export interface UpdateFlockInput {
  id: string;
  /** The version the form was loaded with. */
  expectedVersion: number;
  values: FlockInput;
}

/**
 * Owner-only. The update only matches while the flock is still at the version
 * the form loaded, so a stale edit changes nothing and is reported instead of
 * silently overwriting a colleague's change. Values are validated again here;
 * the browser's checks are a convenience, not the gate.
 */
export async function updateFlockAction(
  input: UpdateFlockInput,
): Promise<UpdateFlockResult> {
  await requireProfile("owner");

  const idCheck = z.string().uuid().safeParse(input.id);
  const versionCheck = z.number().int().positive().safeParse(input.expectedVersion);
  if (!idCheck.success || !versionCheck.success) {
    return { status: "failed", message: "This flock could not be identified. Reload the page." };
  }

  const parsed = parseWith(flockSchema(await getToday()), input.values);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
  const v = parsed.data;

  const { data, error } = await createClient()
    .from("flocks")
    .update({
      name: v.name,
      breed: v.breed ?? null,
      house: v.house ?? null,
      initial_count: v.initialCount,
      placed_on: v.placedOn,
      placed_age_days: v.placedAgeDays,
    })
    .eq("id", input.id)
    .eq("version", input.expectedVersion)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return { status: "invalid", errors: { name: "A flock with this name already exists." } };
    }
    return { status: "failed", message: "The server could not save the changes. Try again." };
  }
  if (!data || data.length === 0) {
    return {
      status: "conflict",
      message: "Someone else changed this flock while you were editing. Reload to see their changes, then redo yours.",
    };
  }

  revalidatePath("/flocks");
  revalidatePath(`/flocks/${input.id}`);
  revalidatePath("/overview");
  return { status: "saved" };
}
