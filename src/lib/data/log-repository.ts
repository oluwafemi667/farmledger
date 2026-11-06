import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EggCollectionInput,
  FeedInput,
  FlockInput,
  HealthInput,
  MortalityInput,
  VaccinationInput,
} from "@/lib/domain/schemas";
import { classifySaveError, type SaveResult } from "./errors";
import type { Outbox, OutboxTable } from "./outbox";
import {
  toEggRow,
  toFeedRow,
  toFlockRow,
  toHealthRow,
  toMortalityRow,
  toVaccinationRow,
  type RecordMeta,
} from "./rows";

/**
 * The only way screens save data. Stage 3 sends straight to Supabase; stage 4
 * swaps in an implementation that writes to the local outbox first and syncs in
 * the background. The forms do not change, because they only see this interface.
 */
export interface LogRepository {
  saveEggCollection(meta: RecordMeta, input: EggCollectionInput): Promise<SaveResult>;
  saveMortality(meta: RecordMeta, input: MortalityInput): Promise<SaveResult>;
  saveFeed(meta: RecordMeta, input: FeedInput): Promise<SaveResult>;
  saveVaccination(meta: RecordMeta, input: VaccinationInput): Promise<SaveResult>;
  saveFlock(meta: RecordMeta, input: FlockInput): Promise<SaveResult>;
  saveHealth(meta: RecordMeta, input: HealthInput): Promise<SaveResult>;
}

type Table =
  | "egg_collections"
  | "mortality_logs"
  | "feed_logs"
  | "vaccinations"
  | "health_events"
  | "flocks";

/**
 * Insert-if-new. `ignoreDuplicates` turns a repeat of an existing id into a
 * no-op, and the returned rows tell us which happened: one row means we stored
 * it, none means the server already had it.
 */
async function insertOnce(
  client: SupabaseClient,
  table: Table,
  row: Record<string, unknown>,
): Promise<SaveResult> {
  try {
    const { data, error } = await client
      .from(table)
      .upsert(row, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) return classifySaveError(error);
    return data && data.length > 0 ? { status: "saved" } : { status: "duplicate" };
  } catch (e) {
    return classifySaveError({ message: e instanceof Error ? e.message : String(e) });
  }
}

export function createSupabaseLogRepository(client: SupabaseClient): LogRepository {
  return {
    saveEggCollection: (m, v) => insertOnce(client, "egg_collections", toEggRow(m, v)),
    saveMortality: (m, v) => insertOnce(client, "mortality_logs", toMortalityRow(m, v)),
    saveFeed: (m, v) => insertOnce(client, "feed_logs", toFeedRow(m, v)),
    saveVaccination: (m, v) => insertOnce(client, "vaccinations", toVaccinationRow(m, v)),
    saveFlock: (m, v) => insertOnce(client, "flocks", toFlockRow(m, v)),
    saveHealth: (m, v) => insertOnce(client, "health_events", toHealthRow(m, v)),
  };
}

/** Upload one queued row. Used by the outbox when it syncs. */
export const sendRow = (client: SupabaseClient) => (table: OutboxTable, row: Record<string, unknown>) =>
  insertOnce(client, table, row);

/**
 * Daily records try the server first, with a short timeout so a weak signal never
 * leaves the farmhand staring at a spinner. If the connection is the problem the
 * record is kept on the device and uploaded later, and the form says so. A record
 * the server actively rejects is NOT queued: the person is told right away.
 */
export function createOutboxLogRepository(client: SupabaseClient, outbox: Outbox, timeoutMs = 8000): LogRepository {
  const direct = createSupabaseLogRepository(client);
  const attempt = async (table: OutboxTable, row: Record<string, unknown>): Promise<SaveResult> => {
    const timeout = new Promise<SaveResult>((r) => setTimeout(() => r({ status: "failed", retryable: true, message: "timed out" }), timeoutMs));
    const result = await Promise.race([insertOnce(client, table, row), navigator.onLine === false ? Promise.resolve<SaveResult>({ status: "failed", retryable: true, message: "offline" }) : timeout]);
    if (result.status === "failed" && result.retryable) {
      try {
        await outbox.enqueue(table, row);
        return { status: "queued" };
      } catch {
        return result; // storage blocked: be honest that nothing was kept
      }
    }
    return result;
  };
  return {
    ...direct,
    saveEggCollection: (m, v) => attempt("egg_collections", toEggRow(m, v)),
    saveMortality: (m, v) => attempt("mortality_logs", toMortalityRow(m, v)),
    saveFeed: (m, v) => attempt("feed_logs", toFeedRow(m, v)),
    saveVaccination: (m, v) => attempt("vaccinations", toVaccinationRow(m, v)),
    saveHealth: (m, v) => attempt("health_events", toHealthRow(m, v)),
  };
}
