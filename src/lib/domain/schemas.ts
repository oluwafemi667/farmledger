import { z } from "zod";
import { isIsoDate } from "./dates";
import { HEALTH_SIGN_IDS } from "./health";

/**
 * Validation for everything a person can enter. The same schemas run in the
 * browser (instant feedback) and again on save, so bad data cannot reach the
 * queue or the database. Messages are written for a farmhand, not a developer.
 */

const uuid = z.string().uuid("Choose a flock.");

/** A real date that is not in the future relative to `today`. */
const pastOrToday = (today: string, label = "Date") =>
  z
    .string({ message: `Choose a ${label.toLowerCase()}.` })
    .refine(isIsoDate, `Choose a valid ${label.toLowerCase()}.`)
    .refine((d) => d <= today, `${label} cannot be in the future.`);

const wholeNumber = (empty: string) =>
  z.number({ message: empty }).int("Use a whole number.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v ? v : undefined))
    .optional();

// ---------------------------------------------------------------- daily logs

export const eggCollectionSchema = (today: string) =>
  z
    .object({
      flockId: uuid,
      collectedOn: pastOrToday(today, "Date"),
      eggs: wholeNumber("Enter the number of eggs collected.")
        .min(0, "Eggs cannot be negative.")
        .max(100_000, "That looks too high. Check the number."),
      broken: wholeNumber("Enter 0 if none were broken.").min(0, "Cannot be negative."),
      notes: optionalText(500),
    })
    .refine((v) => v.broken <= v.eggs, {
      message: "Broken eggs cannot be more than eggs collected.",
      path: ["broken"],
    });

export const mortalitySchema = (today: string) =>
  z.object({
    flockId: uuid,
    loggedOn: pastOrToday(today, "Date"),
    kind: z.enum(["death", "cull"], { message: "Choose death or cull." }),
    birds: wholeNumber("Enter how many birds.")
      .min(1, "Enter at least 1 bird.")
      .max(100_000, "That looks too high. Check the number."),
    reason: optionalText(200),
    notes: optionalText(500),
  });

export const feedSchema = (today: string) =>
  z.object({
    flockId: uuid,
    loggedOn: pastOrToday(today, "Date"),
    feedType: z
      .string({ message: "Enter the feed type." })
      .trim()
      .min(1, "Enter the feed type.")
      .max(60, "Keep the feed type under 60 characters."),
    quantity: z
      .number({ message: "Enter the quantity." })
      .positive("Quantity must be more than 0.")
      .max(100_000, "That looks too high. Check the number."),
    unit: z.enum(["kg", "bag"], { message: "Choose kg or bags." }),
    notes: optionalText(500),
  });

export const vaccinationSchema = (today: string) =>
  z.object({
    flockId: uuid,
    scheduleId: z.string().uuid().optional(),
    vaccineName: z
      .string({ message: "Enter the vaccine name." })
      .trim()
      .min(1, "Enter the vaccine name.")
      .max(80, "Keep the name under 80 characters."),
    administeredOn: pastOrToday(today, "Date"),
    method: optionalText(60),
    batchNumber: optionalText(60),
    notes: optionalText(500),
  });

// ---------------------------------------------------------------- health

export const healthSchema = (today: string) =>
  z.object({
    flockId: uuid,
    observedOn: pastOrToday(today, "Date"),
    signs: z
      .array(z.enum(HEALTH_SIGN_IDS), { message: "Tick at least one sign." })
      .min(1, "Tick at least one sign.")
      .max(12),
    birdsAffected: z
      .number({ message: "Use a whole number." })
      .int("Use a whole number.")
      .min(0, "Cannot be negative.")
      .max(100_000, "That looks too high. Check the number.")
      .nullable()
      .optional(),
    notes: optionalText(500),
  });

// ---------------------------------------------------------------- flocks

export const flockSchema = (today: string) =>
  z.object({
    name: z
      .string({ message: "Enter a name for the flock." })
      .trim()
      .min(1, "Enter a name for the flock.")
      .max(60, "Keep the name under 60 characters."),
    breed: optionalText(60),
    house: optionalText(60),
    initialCount: wholeNumber("Enter how many birds were placed.")
      .min(1, "Enter at least 1 bird.")
      .max(1_000_000, "That looks too high. Check the number."),
    placedOn: pastOrToday(today, "Placement date"),
    placedAgeDays: wholeNumber("Enter the age in days, or 0 for day-old chicks.")
      .min(0, "Age cannot be negative.")
      .max(1_500, "That looks too high. Check the age."),
  });

export type EggCollectionInput = z.infer<ReturnType<typeof eggCollectionSchema>>;
export type MortalityInput = z.infer<ReturnType<typeof mortalitySchema>>;
export type FeedInput = z.infer<ReturnType<typeof feedSchema>>;
export type VaccinationInput = z.infer<ReturnType<typeof vaccinationSchema>>;
export type HealthInput = z.infer<ReturnType<typeof healthSchema>>;
export type FlockInput = z.infer<ReturnType<typeof flockSchema>>;

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

/** Validate raw form values, returning data or per-field messages. */
export function parseWith<S extends z.ZodType>(
  schema: S,
  raw: unknown,
): ParseResult<z.output<S>> {
  const result = schema.safeParse(raw);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, errors: fieldErrors(result.error) };
}

/** Field name -> first error message, for rendering beside inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
