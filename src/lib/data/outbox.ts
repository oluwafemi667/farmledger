import type { SaveResult } from "./errors";

export type OutboxTable = "egg_collections" | "mortality_logs" | "feed_logs" | "vaccinations" | "health_events";

export interface OutboxEntry {
  id: string;
  table: OutboxTable;
  row: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  /** waiting: will retry. failed: the server rejected it; kept for a person to look at, never dropped. */
  state: "waiting" | "failed";
  lastError?: string;
}

/** Where queued records live. IndexedDB in the browser, a Map in tests. */
export interface OutboxStore {
  put(entry: OutboxEntry): Promise<void>;
  all(): Promise<OutboxEntry[]>;
  remove(id: string): Promise<void>;
}

export type Send = (table: OutboxTable, row: Record<string, unknown>) => Promise<SaveResult>;

export interface OutboxSnapshot {
  waiting: number;
  failed: number;
  syncing: boolean;
}

/**
 * Records created offline wait here. Each one carries the id it was given on the
 * device, and the server ignores a repeated id, so a record that is sent twice
 * (flaky signal, two tabs, a retry) is still stored exactly once.
 */
export class Outbox {
  private snap: OutboxSnapshot = { waiting: 0, failed: 0, syncing: false };
  private listeners = new Set<() => void>();
  private running: Promise<void> | null = null;

  constructor(private store: OutboxStore, private send: Send) {}

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
  getSnapshot = () => this.snap;

  private set(next: Partial<OutboxSnapshot>) {
    this.snap = { ...this.snap, ...next };
    this.listeners.forEach((l) => l());
  }

  async refresh() {
    const all = await this.store.all();
    this.set({ waiting: all.filter((e) => e.state === "waiting").length, failed: all.filter((e) => e.state === "failed").length });
  }

  async enqueue(table: OutboxTable, row: Record<string, unknown>) {
    const id = String(row.id);
    await this.store.put({ id, table, row, createdAt: Date.now(), attempts: 0, state: "waiting" });
    await this.refresh();
  }

  /** Send everything waiting, oldest first. Stops at the first connection problem. One run at a time. */
  flush(): Promise<void> {
    this.running ??= this.run().finally(() => { this.running = null; });
    return this.running;
  }

  private async run() {
    const entries = (await this.store.all()).filter((e) => e.state === "waiting").sort((a, b) => a.createdAt - b.createdAt);
    if (entries.length === 0) return this.refresh();
    this.set({ syncing: true });
    try {
      for (const e of entries) {
        const r = await this.send(e.table, e.row);
        if (r.status === "saved" || r.status === "duplicate" || r.status === "queued") {
          if (r.status !== "queued") await this.store.remove(e.id);
          else break;
        } else if (r.retryable) {
          await this.store.put({ ...e, attempts: e.attempts + 1, lastError: r.message });
          break; // still offline: later records would fail the same way
        } else {
          await this.store.put({ ...e, attempts: e.attempts + 1, state: "failed", lastError: r.message });
        }
      }
    } finally {
      this.set({ syncing: false });
      await this.refresh();
    }
  }

  /** Put a rejected record back in the queue after the cause is fixed. */
  async retryFailed() {
    for (const e of await this.store.all()) if (e.state === "failed") await this.store.put({ ...e, state: "waiting" });
    await this.refresh();
    return this.flush();
  }
}

export function memoryStore(): OutboxStore {
  const m = new Map<string, OutboxEntry>();
  return {
    put: async (e) => { m.set(e.id, e); },
    all: async () => [...m.values()],
    remove: async (id) => { m.delete(id); },
  };
}

/** IndexedDB-backed store. Falls back to memory when the browser blocks storage. */
export function indexedDbStore(): OutboxStore {
  let dbp: Promise<IDBDatabase> | null = null;
  const open = () =>
    (dbp ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("farmledger-outbox", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("outbox", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  const run = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction("outbox", mode).objectStore("outbox"));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };
  return {
    put: async (e) => { await run("readwrite", (s) => s.put(e)); },
    all: () => run("readonly", (s) => s.getAll() as IDBRequest<OutboxEntry[]>),
    remove: async (id) => { await run("readwrite", (s) => s.delete(id)); },
  };
}
