"use client";

import { useRef, useState } from "react";
import type { ParseResult } from "@/lib/domain/schemas";
import { newRecordId, type RecordMeta } from "@/lib/data/rows";
import type { SaveResult } from "@/lib/data/errors";

export type SubmitStatus = "idle" | "saving" | "saved" | "failed";

interface Options<T> {
  farmId: string;
  validate: () => ParseResult<T>;
  save: (meta: RecordMeta, data: T) => Promise<SaveResult>;
}

/**
 * Shared submit flow for every log form.
 *
 *  - One record id per entry. Retrying after a failure, or tapping Save twice,
 *    reuses it, so the server can never end up with two copies.
 *  - Saves are blocked while one is in flight (double-tap guard).
 *  - A failed save keeps the figures on screen; nothing is thrown away.
 *  - Nothing is flagged until the first Save tap. After that, errors are
 *    re-checked on every change, so a message disappears as soon as the
 *    field is fixed.
 */
export function useRecordSubmit<T>({ farmId, validate, save }: Options<T>) {
  const idRef = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<{ message: string; retryable: boolean } | null>(null);
  /** True when the record is stored on this device and will upload by itself. */
  const [queued, setQueued] = useState(false);

  let errors: Record<string, string> = {};
  if (attempted) {
    const live = validate();
    if (!live.ok) errors = live.errors;
  }

  async function submit() {
    if (inFlight.current) return;
    setAttempted(true);
    const parsed = validate();
    if (!parsed.ok) {
      setFailure(null);
      setStatus("idle");
      return;
    }
    setFailure(null);

    idRef.current ??= newRecordId();
    inFlight.current = true;
    setStatus("saving");
    let result: SaveResult;
    try {
      result = await save({ id: idRef.current, farmId }, parsed.data);
    } finally {
      inFlight.current = false;
    }

    if (result.status === "failed") {
      setFailure({ message: result.message, retryable: result.retryable });
      setStatus("failed");
      return;
    }
    // "saved" and "duplicate" mean the server has it; "queued" means this device does, safely.
    setQueued(result.status === "queued");
    setStatus("saved");
  }

  /** Start a fresh entry: a new record id, no leftover errors. */
  function reset() {
    idRef.current = null;
    setStatus("idle");
    setAttempted(false);
    setFailure(null);
    setQueued(false);
  }

  return { status, errors, failure, queued, submit, reset };
}
