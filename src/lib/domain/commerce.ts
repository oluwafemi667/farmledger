import { z } from "zod";
import { isIsoDate } from "./dates";
import { KG_PER_BAG } from "./units";

/**
 * Validation for the owner's money and stock records. Same rule as the daily
 * logs: the browser checks for instant feedback and the server checks again.
 */

const date = (label: string) =>
  z.string({ message: `Choose a ${label}.` }).refine(isIsoDate, `Choose a valid ${label}.`);

const pastOrToday = (today: string, label: string) =>
  date(label).refine((d) => d <= today, `${label[0].toUpperCase()}${label.slice(1)} cannot be in the future.`);

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v ? v : undefined))
    .optional();

const requiredText = (empty: string, max: number) =>
  z.string({ message: empty }).trim().min(1, empty).max(max, `Keep this under ${max} characters.`);

/** Naira, to the kobo. Capped so a slipped finger cannot enter a billion. */
const naira = (empty: string, allowZero = false) => {
  const n = z.number({ message: empty }).max(1_000_000_000, "That looks too high. Check the amount.");
  return (allowZero ? n.min(0, "Cannot be negative.") : n.positive("Enter more than 0.")).refine(
    (v) => Math.round(v * 100) === v * 100 || Math.abs(Math.round(v * 100) - v * 100) < 1e-6,
    "Use at most 2 decimal places.",
  );
};

export const EGG_GRADES = ["small", "medium", "large", "jumbo"] as const;
export const SALE_CATEGORIES = ["eggs", "spent_hens", "manure", "other"] as const;
export const EXPENSE_CATEGORIES = ["feed", "medication", "labour", "utilities", "transport", "equipment", "other"] as const;
export const PAYMENT_METHODS = ["cash", "transfer", "pos", "cheque", "other"] as const;

export const gradeLabel: Record<string, string> = {
  small: "Small", medium: "Medium", large: "Large", jumbo: "Jumbo", ungraded: "Not yet sorted",
};
export const saleLabel: Record<(typeof SALE_CATEGORIES)[number], string> = {
  eggs: "Eggs", spent_hens: "Spent hens", manure: "Manure", other: "Other",
};
export const expenseLabel: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  feed: "Feed", medication: "Medication", labour: "Labour", utilities: "Utilities",
  transport: "Transport", equipment: "Equipment", other: "Other",
};
export const methodLabel: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash", transfer: "Bank transfer", pos: "POS", cheque: "Cheque", other: "Other",
};

// ---------------------------------------------------------------- stock

export const feedPurchaseSchema = (today: string) =>
  z.object({
    purchasedOn: pastOrToday(today, "date"),
    feedType: requiredText("Enter the feed type.", 60),
    supplier: text(100),
    quantity: z.number({ message: "Enter the quantity." }).positive("Quantity must be more than 0.").max(1_000_000, "That looks too high."),
    unit: z.enum(["kg", "bag"], { message: "Choose kg or bags." }),
    costNgn: naira("Enter what you paid.", true),
  }).transform((v) => ({ ...v, quantityKg: Math.round((v.unit === "bag" ? v.quantity * KG_PER_BAG : v.quantity) * 100) / 100 }));

export const eggAdjustmentSchema = (today: string) =>
  z.object({
    adjustedOn: pastOrToday(today, "date"),
    grade: z.enum([...EGG_GRADES, "ungraded"], { message: "Choose a size." }),
    direction: z.enum(["add", "remove"], { message: "Choose add or remove." }),
    eggs: z.number({ message: "Enter the number of eggs." }).int("Use a whole number.").positive("Enter at least 1 egg.").max(10_000_000, "That looks too high."),
    reason: requiredText("Say why, for example opening stock or eggs spoiled.", 200),
  }).transform((v) => ({ ...v, signedEggs: v.direction === "add" ? v.eggs : -v.eggs }));

// ---------------------------------------------------------------- money

export const expenseSchema = (today: string) =>
  z.object({
    spentOn: pastOrToday(today, "date"),
    category: z.enum(EXPENSE_CATEGORIES, { message: "Choose a category." }),
    description: text(200),
    amountNgn: naira("Enter the amount."),
    notes: text(500),
  });

export const saleSchema = (today: string) =>
  z.object({
    soldOn: pastOrToday(today, "date"),
    category: z.enum(SALE_CATEGORIES, { message: "Choose what was sold." }),
    description: text(200),
    quantity: z.number().positive("Quantity must be more than 0.").max(10_000_000, "That looks too high.").optional(),
    unit: text(20),
    grade: z.enum(EGG_GRADES).optional(),
    amountNgn: naira("Enter the amount received."),
    buyer: text(100),
  }).refine((v) => v.quantity === undefined || !!v.unit, { message: "Add a unit, for example crate.", path: ["unit"] });

export const customerSchema = z.object({
  name: requiredText("Enter the customer's name.", 100),
  phone: text(30),
  address: text(200),
  notes: text(500),
});

export const invoiceLineSchema = z.object({
  category: z.enum(SALE_CATEGORIES, { message: "Choose what is being sold." }),
  description: requiredText("Describe the line.", 200),
  grade: z.enum(EGG_GRADES).optional(),
  quantity: z.number({ message: "Enter the quantity." }).positive("Quantity must be more than 0.").max(10_000_000, "That looks too high."),
  unit: requiredText("Add a unit, for example crate.", 20),
  unitPriceNgn: naira("Enter the price per unit.", true),
});

export const invoiceSchema = (today: string) =>
  z.object({
    customerId: z.string({ message: "Choose a customer." }).uuid("Choose a customer."),
    issuedOn: pastOrToday(today, "date"),
    dueOn: date("due date"),
    notes: text(500),
    lines: z.array(invoiceLineSchema).min(1, "Add at least one line.").max(50, "At most 50 lines."),
  }).refine((v) => v.dueOn >= v.issuedOn, { message: "The due date cannot be before the invoice date.", path: ["dueOn"] });

export const paymentSchema = (today: string) =>
  z.object({
    invoiceId: z.string().uuid("Choose an invoice."),
    paidOn: pastOrToday(today, "date"),
    amountNgn: naira("Enter the amount received."),
    method: z.enum(PAYMENT_METHODS, { message: "Choose how it was paid." }),
    reference: text(100),
  });

export type FeedPurchaseInput = z.output<ReturnType<typeof feedPurchaseSchema>>;
export type EggAdjustmentInput = z.output<ReturnType<typeof eggAdjustmentSchema>>;
export type ExpenseInput = z.output<ReturnType<typeof expenseSchema>>;
export type SaleInput = z.output<ReturnType<typeof saleSchema>>;
export type CustomerInput = z.output<typeof customerSchema>;
export type InvoiceInput = z.output<ReturnType<typeof invoiceSchema>>;
export type PaymentInput = z.output<ReturnType<typeof paymentSchema>>;

/** Sum of an invoice's lines, rounded to the kobo exactly as the database does. */
export function invoiceTotal(lines: { quantity: number; unitPriceNgn: number }[]): number {
  return lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPriceNgn * 100) / 100, 0);
}

export type ActionResult =
  | { status: "saved"; id?: string }
  | { status: "invalid"; errors: Record<string, string> }
  | { status: "failed"; message: string };
