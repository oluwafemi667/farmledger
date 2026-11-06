"use client";

import { createClient } from "@/lib/supabase/client";
import { sendRow } from "./log-repository";
import { indexedDbStore, memoryStore, Outbox } from "./outbox";

let instance: Outbox | null = null;

/** The one outbox for this browser tab. Created on first use, never on the server. */
export function getOutbox(): Outbox {
  if (!instance) {
    let store = memoryStore();
    try { if (typeof indexedDB !== "undefined") store = indexedDbStore(); } catch { /* blocked: memory only */ }
    instance = new Outbox(store, sendRow(createClient()));
  }
  return instance;
}
