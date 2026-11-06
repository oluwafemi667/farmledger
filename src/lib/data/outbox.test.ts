import { describe, expect, it } from "vitest";
import { memoryStore, Outbox, type Send } from "./outbox";

const row = (id: string) => ({ id, eggs: 10 });

describe("Outbox", () => {
  it("keeps records when offline and sends them once the connection returns", async () => {
    const sent: string[] = [];
    let online = false;
    const send: Send = async (_t, r) => {
      if (!online) return { status: "failed", retryable: true, message: "offline" };
      sent.push(String(r.id));
      return { status: "saved" };
    };
    const box = new Outbox(memoryStore(), send);
    await box.enqueue("egg_collections", row("a"));
    await box.enqueue("egg_collections", row("b"));
    await box.flush();
    expect(box.getSnapshot().waiting).toBe(2);
    online = true;
    await box.flush();
    expect(sent).toEqual(["a", "b"]);
    expect(box.getSnapshot().waiting).toBe(0);
  });

  it("treats a duplicate as success and removes it", async () => {
    const box = new Outbox(memoryStore(), async () => ({ status: "duplicate" }));
    await box.enqueue("feed_logs", row("x"));
    await box.flush();
    expect(box.getSnapshot()).toMatchObject({ waiting: 0, failed: 0 });
  });

  it("keeps a rejected record for review and does not block the rest", async () => {
    const sent: string[] = [];
    const send: Send = async (_t, r) => {
      if (r.id === "bad") return { status: "failed", retryable: false, message: "rejected" };
      sent.push(String(r.id));
      return { status: "saved" };
    };
    const box = new Outbox(memoryStore(), send);
    await box.enqueue("egg_collections", row("bad"));
    await box.enqueue("egg_collections", row("good"));
    await box.flush();
    expect(sent).toEqual(["good"]);
    expect(box.getSnapshot()).toMatchObject({ waiting: 0, failed: 1 });
  });

  it("runs one flush at a time", async () => {
    let calls = 0;
    const send: Send = async () => { calls++; await new Promise((r) => setTimeout(r, 10)); return { status: "saved" }; };
    const box = new Outbox(memoryStore(), send);
    await box.enqueue("egg_collections", row("a"));
    await Promise.all([box.flush(), box.flush(), box.flush()]);
    expect(calls).toBe(1);
  });

  it("can retry a rejected record after the cause is fixed", async () => {
    let reject = true;
    const send: Send = async () => (reject ? { status: "failed", retryable: false, message: "no" } : { status: "saved" });
    const box = new Outbox(memoryStore(), send);
    await box.enqueue("feed_logs", row("r"));
    await box.flush();
    expect(box.getSnapshot().failed).toBe(1);
    reject = false;
    await box.retryFailed();
    expect(box.getSnapshot()).toMatchObject({ waiting: 0, failed: 0 });
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { createOutboxLogRepository } from "./log-repository";

const clientThatFails = (message: string, code?: string) =>
  ({ from: () => ({ upsert: () => ({ select: async () => ({ data: null, error: { message, code } }) }) }) }) as unknown as SupabaseClient;

const eggs = { flockId: "f", collectedOn: "2026-11-04", eggs: 100, broken: 2, notes: "" } as never;

describe("createOutboxLogRepository", () => {
  it("queues a record when there is no connection", async () => {
    const box = new Outbox(memoryStore(), async () => ({ status: "saved" }));
    const repo = createOutboxLogRepository(clientThatFails("TypeError: Failed to fetch"), box);
    const r = await repo.saveEggCollection({ id: "i1", farmId: "farm" }, eggs);
    expect(r.status).toBe("queued");
    expect(box.getSnapshot().waiting).toBe(1);
  });

  it("does not queue a record the server rejected", async () => {
    const box = new Outbox(memoryStore(), async () => ({ status: "saved" }));
    const repo = createOutboxLogRepository(clientThatFails("violates check", "23514"), box);
    const r = await repo.saveEggCollection({ id: "i2", farmId: "farm" }, eggs);
    expect(r.status).toBe("failed");
    expect(box.getSnapshot().waiting).toBe(0);
  });
});
