"use server";

import { revalidatePath } from "next/cache";
import { flockIdSchema, healthReviewSchema, idSchema, moveScheduleSchema, scheduleItemSchema } from "@/lib/domain/care";
import type { ActionResult } from "@/lib/domain/commerce";
import { ownerAction } from "@/lib/data/owner-action";

const done = async (r: Promise<ActionResult>) => {
  const out = await r;
  if (out.status === "saved") revalidatePath("/flocks", "layout");
  return out;
};

/** The vet's findings, treatment, egg hold and whether the problem is over. Owner only. */
export const reviewHealthEvent = (raw: unknown) =>
  done(ownerAction(healthReviewSchema, raw, async (db, v) => ({
    error: (await db.from("health_events").update({
      vet_findings: v.vetFindings ?? null, treatment: v.treatment ?? null,
      egg_hold_until: v.eggHoldUntil ?? null, resolved_on: v.resolvedOn,
    }).eq("id", v.id)).error,
  })));

export const addScheduleItem = (raw: unknown) =>
  done(ownerAction(scheduleItemSchema, raw, async (db, v, farmId) => ({
    error: (await db.from("vaccine_schedule").insert({ farm_id: farmId, flock_id: v.flockId, vaccine_name: v.vaccineName, due_on: v.dueOn })).error,
  })));

export const moveScheduleItem = (raw: unknown) =>
  done(ownerAction(moveScheduleSchema, raw, async (db, v) => ({
    error: (await db.from("vaccine_schedule").update({ due_on: v.dueOn }).eq("id", v.id)).error,
  })));

export const removeScheduleItem = (raw: unknown) =>
  done(ownerAction(idSchema, raw, async (db, v) => ({
    error: (await db.from("vaccine_schedule").delete().eq("id", v.id)).error,
  })));

export const applyStandardProgramme = (raw: unknown) =>
  done(ownerAction(flockIdSchema, raw, async (db, v) => ({
    error: (await db.rpc("apply_vaccine_programme", { p_flock: v.flockId })).error,
  })));
