import { requireProfile } from "@/lib/auth/session";
import { DEMO_READONLY_MESSAGE, isDemoMode } from "@/lib/demo";
import { getToday } from "@/lib/farm";
import { parseWith } from "@/lib/domain/schemas";
import type { ActionResult } from "@/lib/domain/commerce";
import { createClient } from "@/lib/supabase/server";
import type { z } from "zod";

type Db = ReturnType<typeof createClient>;

/**
 * The shared shape of every owner-only write: confirm the caller is the owner,
 * validate on the server against the same schema the form used, run the write,
 * and turn a database error into a message a person can act on. Nothing here
 * trusts what the browser says about who the user is or what is valid.
 */
export async function ownerAction<S extends z.ZodType>(
  schema: (today: string) => S,
  raw: unknown,
  write: (db: Db, data: z.output<S>, farmId: string) => Promise<{ error: { code?: string; message?: string } | null; id?: string }>,
  messages: { duplicate?: string } = {},
): Promise<ActionResult> {
  const profile = await requireProfile("owner");
  const parsed = parseWith(schema(await getToday()), raw);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };
  const { error, id } = await write(createClient(), parsed.data, profile.farmId);
  if (error) {
    if (error.code === "42501" && isDemoMode()) return { status: "invalid", errors: { form: DEMO_READONLY_MESSAGE } };
    if (error.code === "23505") return { status: "invalid", errors: { form: messages.duplicate ?? "That already exists." } };
    // Our own SQL functions raise plain-language messages with code 22023.
    if (error.code === "22023" && error.message) return { status: "invalid", errors: { form: error.message } };
    return { status: "failed", message: "The server could not save this. Check your connection and try again." };
  }
  return { status: "saved", id };
}
