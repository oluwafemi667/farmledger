"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { createOutboxLogRepository, type LogRepository } from "@/lib/data/log-repository";
import { getOutbox } from "@/lib/data/outbox-client";

/**
 * The repository the forms save through. Daily records go through the offline
 * outbox, so a weak signal never loses an entry. `override` lets the design
 * preview run the forms without a database.
 */
export function useRepository(override?: LogRepository): LogRepository {
  return useMemo(
    () => override ?? createOutboxLogRepository(createClient(), getOutbox()),
    [override],
  );
}
