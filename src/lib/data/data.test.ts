import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifySaveError } from "./errors";
import { createSupabaseLogRepository } from "./log-repository";
import { toEggRow, toFeedRow, toMortalityRow } from "./rows";

const meta = { id: "99999999-9999-4999-8999-999999999991", farmId: "00000000-0000-4000-8000-00000000f001" };
const FLOCK = "00000000-0000-4000-8000-0000000a0001";

describe("row mapping", () => {
  it("maps an egg entry to database columns, keeping the client id", () => {
    expect(toEggRow(meta, { flockId: FLOCK, collectedOn: "2026-11-03", eggs: 240, broken: 3 })).toEqual({
      id: meta.id,
      farm_id: meta.farmId,
      flock_id: FLOCK,
      collected_on: "2026-11-03",
      eggs: 240,
      broken: 3,
      notes: null,
    });
  });

  it("stores feed in kilograms even when entered in bags", () => {
    const row = toFeedRow(meta, {
      flockId: FLOCK,
      loggedOn: "2026-11-03",
      feedType: "Layer mash",
      quantity: 3,
      unit: "bag",
    });
    expect(row.quantity_kg).toBe(75);
  });

  it("keeps the death/cull distinction", () => {
    const row = toMortalityRow(meta, { flockId: FLOCK, loggedOn: "2026-11-03", kind: "cull", birds: 2 });
    expect(row.kind).toBe("cull");
    expect(row.birds).toBe(2);
  });
});

describe("error classification", () => {
  it("treats a dropped connection as retryable", () => {
    const r = classifySaveError({ message: "TypeError: Failed to fetch" });
    expect(r).toMatchObject({ status: "failed", retryable: true });
  });

  it("treats an error with no code and no status as a network failure", () => {
    expect(classifySaveError({ message: "something odd" })).toMatchObject({ retryable: true });
  });

  it("does not retry permission, validation or missing-flock rejections", () => {
    expect(classifySaveError({ code: "42501", message: "rls" })).toMatchObject({ retryable: false });
    expect(classifySaveError({ code: "23514", message: "check" })).toMatchObject({ retryable: false });
    expect(classifySaveError({ code: "23503", message: "fk" })).toMatchObject({ retryable: false });
  });

  it("retries an expired session", () => {
    expect(classifySaveError({ code: "PGRST301", message: "JWT expired" })).toMatchObject({ retryable: true });
  });

  it("retries server-side failures", () => {
    expect(classifySaveError({ code: "XX000", message: "internal", status: 500 })).toMatchObject({ retryable: true });
  });
});

/** A stand-in for supabase-js that records the calls made to it. */
function fakeClient(result: { data: unknown[] | null; error: unknown }) {
  const calls: { table: string; row: unknown; options: unknown }[] = [];
  const client = {
    from(table: string) {
      return {
        upsert(row: unknown, options: unknown) {
          calls.push({ table, row, options });
          return { select: vi.fn().mockResolvedValue(result) };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("supabase log repository", () => {
  const input = { flockId: FLOCK, collectedOn: "2026-11-03", eggs: 100, broken: 1 };

  it("upserts by id and ignores duplicates", async () => {
    const { client, calls } = fakeClient({ data: [{ id: meta.id }], error: null });
    const result = await createSupabaseLogRepository(client).saveEggCollection(meta, input);
    expect(result).toEqual({ status: "saved" });
    expect(calls[0].table).toBe("egg_collections");
    expect(calls[0].options).toEqual({ onConflict: "id", ignoreDuplicates: true });
  });

  it("reports a repeat of an existing id as a safe duplicate, not an error", async () => {
    const { client } = fakeClient({ data: [], error: null });
    const result = await createSupabaseLogRepository(client).saveEggCollection(meta, input);
    expect(result).toEqual({ status: "duplicate" });
  });

  it("returns a classified failure when the server errors", async () => {
    const { client } = fakeClient({ data: null, error: { code: "42501", message: "rls" } });
    const result = await createSupabaseLogRepository(client).saveEggCollection(meta, input);
    expect(result).toMatchObject({ status: "failed", retryable: false });
  });

  it("returns a retryable failure instead of throwing when the network call throws", async () => {
    const client = {
      from() {
        throw new TypeError("Failed to fetch");
      },
    } as unknown as SupabaseClient;
    const result = await createSupabaseLogRepository(client).saveEggCollection(meta, input);
    expect(result).toMatchObject({ status: "failed", retryable: true });
  });
});
