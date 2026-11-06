import { z } from "zod";
import { isIsoDate } from "./dates";

/** Owner-side records for animal care: the vet's findings on a health report, and the vaccination schedule. */

const iso = (label: string) => z.string({ message: `Choose a ${label}.` }).refine(isIsoDate, `Choose a valid ${label}.`);
const text = (max: number) =>
  z.string().trim().max(max, `Keep this under ${max} characters.`).transform((v) => (v ? v : undefined)).optional();

export const healthReviewSchema = (today: string) =>
  z
    .object({
      id: z.string().uuid(),
      vetFindings: text(500),
      treatment: text(300),
      eggHoldUntil: z.string().refine((v) => v === "" || isIsoDate(v), "Choose a valid date.").transform((v) => (v ? v : undefined)).optional(),
      resolved: z.boolean(),
    })
    .transform((v) => ({ ...v, resolvedOn: v.resolved ? today : null }));

export const scheduleItemSchema = () =>
  z.object({
    flockId: z.string().uuid("Choose a flock."),
    vaccineName: z.string({ message: "Enter the vaccine name." }).trim().min(1, "Enter the vaccine name.").max(80, "Keep the name under 80 characters."),
    dueOn: iso("date"),
  });

export const moveScheduleSchema = () => z.object({ id: z.string().uuid(), dueOn: iso("date") });
export const idSchema = () => z.object({ id: z.string().uuid() });
export const flockIdSchema = () => z.object({ flockId: z.string().uuid() });
