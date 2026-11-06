import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { addDays, todayIn } from "@/lib/domain/dates";
import type { DaySummary } from "@/types/domain";

/**
 * Server-side reads. Everything goes through the caller's session, so Row Level
 * Security decides what comes back. When Supabase is not configured each query
 * returns an empty result instead of throwing, so pages still render.
 */

const DEFAULT_TIMEZONE = "Africa/Lagos";

export interface FarmSummary {
  name: string;
  isDemo: boolean;
  timezone: string;
}

export interface FlockSummary {
  id: string;
  name: string;
  breed: string | null;
  house: string | null;
  activeBirds: number;
  initialCount: number;
  ageDays: number;
}

export interface FlockRecord {
  id: string;
  name: string;
  birdType: string;
  breed: string | null;
  house: string | null;
  initialCount: number;
  placedOn: string;
  placedAgeDays: number;
  status: "active" | "retired";
  notes: string | null;
  version: number;
}

export interface DailyRow {
  day: string;
  eggs: number;
  broken: number;
  deaths: number;
  feedKg: number;
}

export interface VaccinationRecord {
  id: string;
  vaccineName: string;
  administeredOn: string;
  method: string | null;
  batchNumber: string | null;
  notes: string | null;
}

/** The signed-in user's farm. RLS guarantees this can only be their own. */
export const getFarm = cache(async (): Promise<FarmSummary | null> => {
  if (!isSupabaseConfigured()) return null;
  const { data } = await createClient()
    .from("farms")
    .select("name, is_demo, timezone")
    .maybeSingle();
  return data
    ? {
        name: data.name as string,
        isDemo: !!data.is_demo,
        timezone: (data.timezone as string) || DEFAULT_TIMEZONE,
      }
    : null;
});

/** Today's date in the farm's own time zone. */
export const getToday = cache(async (): Promise<string> => {
  const farm = await getFarm();
  return todayIn(farm?.timezone ?? DEFAULT_TIMEZONE);
});

function toFlockSummary(f: Record<string, unknown>): FlockSummary {
  return {
    id: f.id as string,
    name: f.name as string,
    breed: (f.breed as string | null) ?? null,
    house: (f.house as string | null) ?? null,
    activeBirds: f.active_birds as number,
    initialCount: f.initial_count as number,
    ageDays: f.age_days as number,
  };
}

const FLOCK_STATUS_COLUMNS =
  "id, name, breed, house, active_birds, initial_count, total_lost, placed_on, age_days, status";

/** Active flocks with their derived live bird count (flock_status view). */
export const getFlocks = cache(async (): Promise<FlockSummary[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient()
    .from("flock_status")
    .select(FLOCK_STATUS_COLUMNS)
    .eq("status", "active")
    .order("name");
  return (data ?? []).map(toFlockSummary);
});

export const getFlockSummary = cache(
  async (id: string): Promise<FlockSummary | null> => {
    if (!isSupabaseConfigured()) return null;
    const { data } = await createClient()
      .from("flock_status")
      .select(FLOCK_STATUS_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    return data ? toFlockSummary(data) : null;
  },
);

/** The editable flock row, including its version for conflict detection. */
export const getFlockRecord = cache(
  async (id: string): Promise<FlockRecord | null> => {
    if (!isSupabaseConfigured()) return null;
    const { data } = await createClient()
      .from("flocks")
      .select(
        "id, name, bird_type, breed, house, initial_count, placed_on, placed_age_days, status, notes, version",
      )
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id as string,
      name: data.name as string,
      birdType: data.bird_type as string,
      breed: (data.breed as string | null) ?? null,
      house: (data.house as string | null) ?? null,
      initialCount: data.initial_count as number,
      placedOn: data.placed_on as string,
      placedAgeDays: data.placed_age_days as number,
      status: data.status as "active" | "retired",
      notes: (data.notes as string | null) ?? null,
      version: data.version as number,
    };
  },
);

/** Per-flock figures for one farm-local day, plus the day before. */
export const getDaySummaries = cache(
  async (day: string): Promise<Record<string, DaySummary>> => {
    if (!isSupabaseConfigured()) return {};
    const { data } = await createClient().rpc("flock_day_summary", { p_day: day });
    const out: Record<string, DaySummary> = {};
    for (const r of (data ?? []) as Record<string, unknown>[]) {
      out[r.flock_id as string] = {
        flockId: r.flock_id as string,
        eggs: r.eggs as number,
        broken: r.broken as number,
        eggEntries: r.egg_entries as number,
        eggsPrev: r.eggs_prev as number,
        deaths: r.deaths as number,
        feedKg: Number(r.feed_kg),
        feedKgPrev: Number(r.feed_kg_prev),
        vaccinesOverdue: r.vaccines_overdue as number,
        nextVaccineName: (r.next_vaccine_name as string | null) ?? null,
        nextVaccineDue: (r.next_vaccine_due as string | null) ?? null,
      };
    }
    return out;
  },
);

/** Daily eggs, deaths and feed for one flock, newest first. */
export const getFlockDaily = cache(
  async (flockId: string, days: number, today: string): Promise<DailyRow[]> => {
    if (!isSupabaseConfigured()) return [];
    const { data } = await createClient().rpc("flock_daily", {
      p_flock: flockId,
      p_from: addDays(today, -(days - 1)),
      p_to: today,
    });
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      day: r.day as string,
      eggs: r.eggs as number,
      broken: r.broken as number,
      deaths: r.deaths as number,
      feedKg: Number(r.feed_kg),
    }));
  },
);

export const getFlockVaccinations = cache(
  async (flockId: string): Promise<VaccinationRecord[]> => {
    if (!isSupabaseConfigured()) return [];
    const { data } = await createClient()
      .from("vaccinations")
      .select("id, vaccine_name, administered_on, method, batch_number, notes")
      .eq("flock_id", flockId)
      .order("administered_on", { ascending: false })
      .limit(20);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      vaccineName: r.vaccine_name as string,
      administeredOn: r.administered_on as string,
      method: (r.method as string | null) ?? null,
      batchNumber: (r.batch_number as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
    }));
  },
);

// ---------------------------------------------------------------- owner series
import type { FarmDay, MoneyDay } from "@/lib/domain/overview";

export interface ScorecardRow {
  flockId: string;
  name: string;
  breed: string | null;
  house: string | null;
  birds: number;
  eggs: number;
  broken: number;
  eggDays: number;
  deaths: number;
  feedKg: number;
}

/** Whole-farm daily series, ascending, ending on `today`. Empty when unconfigured. */
export const getFarmDaily = cache(async (days: number, today: string): Promise<FarmDay[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient().rpc("farm_daily", {
    p_from: addDays(today, -(days - 1)),
    p_to: today,
  });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    day: r.day as string,
    birds: r.birds as number,
    eggs: r.eggs as number,
    broken: r.broken as number,
    deaths: r.deaths as number,
    feedKg: Number(r.feed_kg),
  }));
});

/** Owner-only. A farmhand's call returns zeros, which the owner pages never show them. */
export const getMoneyDaily = cache(async (days: number, today: string): Promise<MoneyDay[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient().rpc("money_daily", {
    p_from: addDays(today, -(days - 1)),
    p_to: today,
  });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    day: r.day as string,
    salesNgn: Number(r.sales_ngn),
    invoicedNgn: Number(r.invoiced_ngn),
    collectedNgn: Number(r.collected_ngn),
    expensesNgn: Number(r.expenses_ngn),
  }));
});

export const getScorecard = cache(async (days: number, today: string): Promise<ScorecardRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient().rpc("flock_scorecard", {
    p_from: addDays(today, -(days - 1)),
    p_to: today,
  });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    flockId: r.flock_id as string,
    name: r.name as string,
    breed: (r.breed as string | null) ?? null,
    house: (r.house as string | null) ?? null,
    birds: r.birds as number,
    eggs: r.eggs as number,
    broken: r.broken as number,
    eggDays: r.egg_days as number,
    deaths: r.deaths as number,
    feedKg: Number(r.feed_kg),
  }));
});

// ---------------------------------------------------------------- stock
export interface FeedPositionRow {
  feedType: string;
  purchasedKg: number;
  usedKg: number;
  onHandKg: number;
  dailyUseKg: number;
  /** Null when there is no recent use to project from. */
  daysLeft: number | null;
}
export interface EggStockRow {
  grade: string;
  collected: number;
  sold: number;
  adjusted: number;
  onHand: number;
}
export interface FeedPurchaseRow {
  id: string;
  purchasedOn: string;
  feedType: string;
  supplier: string | null;
  quantityKg: number;
  costNgn: number;
}

export const getFeedPosition = cache(async (today: string): Promise<FeedPositionRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient().rpc("feed_position", { p_today: today });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    feedType: r.feed_type as string,
    purchasedKg: Number(r.purchased_kg),
    usedKg: Number(r.used_kg),
    onHandKg: Number(r.on_hand_kg),
    dailyUseKg: Number(r.daily_use_kg),
    daysLeft: r.days_left === null ? null : Number(r.days_left),
  }));
});

export const getEggStock = cache(async (): Promise<EggStockRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient().from("egg_stock").select("grade, collected, sold, adjusted, on_hand");
  const order = ["small", "medium", "large", "jumbo", "ungraded"];
  return ((data ?? []) as Record<string, unknown>[])
    .map((r) => ({
      grade: r.grade as string,
      collected: Number(r.collected),
      sold: Number(r.sold),
      adjusted: Number(r.adjusted),
      onHand: Number(r.on_hand),
    }))
    .sort((a, b) => order.indexOf(a.grade) - order.indexOf(b.grade));
});

export const getFeedPurchases = cache(async (limit = 12): Promise<FeedPurchaseRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient()
    .from("feed_purchases")
    .select("id, purchased_on, feed_type, supplier, quantity_kg, cost_ngn")
    .order("purchased_on", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    purchasedOn: r.purchased_on as string,
    feedType: r.feed_type as string,
    supplier: (r.supplier as string | null) ?? null,
    quantityKg: Number(r.quantity_kg),
    costNgn: Number(r.cost_ngn),
  }));
});

// ---------------------------------------------------------------- sales and money
export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}
export interface InvoiceRow {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  issuedOn: string;
  dueOn: string;
  status: "issued" | "void";
  totalNgn: number;
  paidNgn: number;
  balanceNgn: number;
}
export interface InvoiceLine {
  id: string;
  category: string;
  description: string;
  grade: string | null;
  quantity: number;
  unit: string;
  unitPriceNgn: number;
  lineTotalNgn: number;
}
export interface PaymentRow {
  id: string;
  paidOn: string;
  amountNgn: number;
  method: string;
  reference: string | null;
}
export interface LedgerEntry {
  id: string;
  kind: "sale" | "expense";
  day: string;
  label: string;
  detail: string | null;
  amountNgn: number;
}

export const getCustomers = cache(async (): Promise<CustomerRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient().from("customers").select("id, name, phone, address").order("name");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    phone: (r.phone as string | null) ?? null,
    address: (r.address as string | null) ?? null,
  }));
});

const invoiceFromRow = (r: Record<string, unknown>): InvoiceRow => ({
  id: r.id as string,
  number: r.number as string,
  customerId: r.customer_id as string,
  customerName: r.customer_name as string,
  issuedOn: r.issued_on as string,
  dueOn: r.due_on as string,
  status: r.status as "issued" | "void",
  totalNgn: Number(r.total_ngn),
  paidNgn: Number(r.paid_ngn),
  balanceNgn: Number(r.balance_ngn),
});
const INVOICE_COLS = "id, number, customer_id, customer_name, issued_on, due_on, status, total_ngn, paid_ngn, balance_ngn";

export const getInvoices = cache(async (limit = 100): Promise<InvoiceRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient().from("invoice_balances").select(INVOICE_COLS).order("issued_on", { ascending: false }).order("number", { ascending: false }).limit(limit);
  return ((data ?? []) as Record<string, unknown>[]).map(invoiceFromRow);
});

export const getInvoice = cache(async (id: string): Promise<{ invoice: InvoiceRow; lines: InvoiceLine[]; payments: PaymentRow[]; notes: string | null } | null> => {
  if (!isSupabaseConfigured()) return null;
  const sb = createClient();
  const { data: inv } = await sb.from("invoice_balances").select(INVOICE_COLS).eq("id", id).maybeSingle();
  if (!inv) return null;
  const [{ data: lines }, { data: pays }, { data: raw }] = await Promise.all([
    sb.from("invoice_items").select("id, category, description, grade, quantity, unit, unit_price_ngn, line_total_ngn").eq("invoice_id", id),
    sb.from("payments").select("id, paid_on, amount_ngn, method, reference").eq("invoice_id", id).order("paid_on"),
    sb.from("invoices").select("notes").eq("id", id).maybeSingle(),
  ]);
  return {
    invoice: invoiceFromRow(inv as Record<string, unknown>),
    notes: ((raw as { notes?: string | null } | null)?.notes) ?? null,
    lines: ((lines ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      category: r.category as string,
      description: r.description as string,
      grade: (r.grade as string | null) ?? null,
      quantity: Number(r.quantity),
      unit: r.unit as string,
      unitPriceNgn: Number(r.unit_price_ngn),
      lineTotalNgn: Number(r.line_total_ngn),
    })),
    payments: ((pays ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      paidOn: r.paid_on as string,
      amountNgn: Number(r.amount_ngn),
      method: r.method as string,
      reference: (r.reference as string | null) ?? null,
    })),
  };
});

/** Cash sales and expenses together, newest first. */
export const getLedger = cache(async (from: string): Promise<LedgerEntry[]> => {
  if (!isSupabaseConfigured()) return [];
  const sb = createClient();
  const [{ data: sales }, { data: exp }] = await Promise.all([
    sb.from("sales").select("id, sold_on, category, description, buyer, amount_ngn").gte("sold_on", from).order("sold_on", { ascending: false }).limit(200),
    sb.from("expenses").select("id, spent_on, category, description, amount_ngn").gte("spent_on", from).order("spent_on", { ascending: false }).limit(200),
  ]);
  const out: LedgerEntry[] = [
    ...((sales ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, kind: "sale" as const, day: r.sold_on as string,
      label: String(r.category).replace("_", " "),
      detail: ([r.description, r.buyer].filter(Boolean) as string[]).join(", ") || null,
      amountNgn: Number(r.amount_ngn),
    })),
    ...((exp ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, kind: "expense" as const, day: r.spent_on as string,
      label: String(r.category), detail: (r.description as string | null) ?? null,
      amountNgn: Number(r.amount_ngn),
    })),
  ];
  return out.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
});

// ---------------------------------------------------------------- team and audit
export interface StaffRow {
  personId: string;
  fullName: string;
  role: "owner" | "farmhand";
  eggs: number;
  mortality: number;
  feed: number;
  vaccinations: number;
  total: number;
  lastEntryAt: string | null;
}
export interface AuditEntry {
  id: number;
  at: string;
  actorName: string;
  table: string;
  action: "insert" | "update" | "delete";
  rowId: string | null;
  changes: Record<string, unknown>;
}

export const getStaffActivity = cache(async (days: number, today: string): Promise<StaffRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient().rpc("staff_activity", { p_from: addDays(today, -(days - 1)), p_to: today });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    personId: r.person_id as string,
    fullName: r.full_name as string,
    role: r.role as "owner" | "farmhand",
    eggs: r.eggs_entries as number,
    mortality: r.mortality_entries as number,
    feed: r.feed_entries as number,
    vaccinations: r.vaccination_entries as number,
    total: r.total_entries as number,
    lastEntryAt: (r.last_entry_at as string | null) ?? null,
  }));
});

export const getAuditFeed = cache(async (limit = 100): Promise<AuditEntry[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient()
    .from("audit_feed")
    .select("id, at, actor_name, table_name, row_id, action, changes")
    .order("id", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    at: r.at as string,
    actorName: r.actor_name as string,
    table: r.table_name as string,
    action: r.action as "insert" | "update" | "delete",
    rowId: (r.row_id as string | null) ?? null,
    changes: (r.changes as Record<string, unknown>) ?? {},
  }));
});

// ---------------------------------------------------------------- flock economics inputs
export interface EconomicsPool { feedCostPerKg: number | null; otherExpensesNgn: number }

/** Average feed price over the last 90 days of purchases, and the period's non-feed spending. */
export const getEconomicsPool = cache(async (from: string, today: string): Promise<EconomicsPool> => {
  if (!isSupabaseConfigured()) return { feedCostPerKg: null, otherExpensesNgn: 0 };
  const sb = createClient();
  const [{ data: buys }, { data: exp }] = await Promise.all([
    sb.from("feed_purchases").select("quantity_kg, cost_ngn").gte("purchased_on", addDays(today, -89)),
    sb.from("expenses").select("category, amount_ngn").gte("spent_on", from).lte("spent_on", today),
  ]);
  const kg = ((buys ?? []) as Record<string, unknown>[]).reduce((s, r) => s + Number(r.quantity_kg), 0);
  const cost = ((buys ?? []) as Record<string, unknown>[]).reduce((s, r) => s + Number(r.cost_ngn), 0);
  const other = ((exp ?? []) as Record<string, unknown>[])
    .filter((r) => r.category !== "feed")
    .reduce((s, r) => s + Number(r.amount_ngn), 0);
  return { feedCostPerKg: kg > 0 ? cost / kg : null, otherExpensesNgn: other };
});

// ---------------------------------------------------------------- statements and price history
export const getCustomer = cache(async (id: string): Promise<CustomerRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const { data } = await createClient().from("customers").select("id, name, phone, address").eq("id", id).maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return { id: r.id as string, name: r.name as string, phone: (r.phone as string | null) ?? null, address: (r.address as string | null) ?? null };
});

export const getCustomerAccount = cache(async (customerId: string): Promise<{ invoices: InvoiceRow[]; payments: (PaymentRow & { invoiceId: string })[] }> => {
  if (!isSupabaseConfigured()) return { invoices: [], payments: [] };
  const sb = createClient();
  const { data: inv } = await sb.from("invoice_balances").select(INVOICE_COLS).eq("customer_id", customerId).order("issued_on").limit(500);
  const invoices = ((inv ?? []) as Record<string, unknown>[]).map(invoiceFromRow);
  if (invoices.length === 0) return { invoices, payments: [] };
  const { data: pays } = await sb.from("payments").select("id, invoice_id, paid_on, amount_ngn, method, reference").in("invoice_id", invoices.map((i) => i.id)).order("paid_on");
  return {
    invoices,
    payments: ((pays ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, invoiceId: r.invoice_id as string, paidOn: r.paid_on as string,
      amountNgn: Number(r.amount_ngn), method: r.method as string, reference: (r.reference as string | null) ?? null,
    })),
  };
});

/** Every price charged on issued invoices in the last year, for "last charged" hints. */
export const getPriceHistory = cache(async (): Promise<import("@/lib/domain/statement").PriceHistoryRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const sb = createClient();
  const { data: inv } = await sb.from("invoices").select("id, customer_id, issued_on").eq("status", "issued").order("issued_on", { ascending: false }).limit(300);
  const invs = (inv ?? []) as { id: string; customer_id: string; issued_on: string }[];
  if (invs.length === 0) return [];
  const { data: items } = await sb.from("invoice_items").select("invoice_id, category, grade, unit, unit_price_ngn").in("invoice_id", invs.map((i) => i.id));
  const byId = new Map(invs.map((i) => [i.id, i]));
  return ((items ?? []) as Record<string, unknown>[]).flatMap((r) => {
    const i = byId.get(r.invoice_id as string);
    return i ? [{ customerId: i.customer_id, category: r.category as string, grade: (r.grade as string | null) ?? null, unit: r.unit as string, unitPriceNgn: Number(r.unit_price_ngn), issuedOn: i.issued_on }] : [];
  });
});

// ---------------------------------------------------------------- care: schedule, programme, health

export interface ScheduleItem {
  id: string;
  vaccineName: string;
  dueOn: string;
  notes: string | null;
  /** Date the dose was recorded, if any. */
  doneOn: string | null;
}

export const getFlockSchedule = cache(async (flockId: string): Promise<ScheduleItem[]> => {
  if (!isSupabaseConfigured()) return [];
  const db = createClient();
  const { data } = await db.from("vaccine_schedule").select("id, vaccine_name, due_on, notes").eq("flock_id", flockId).order("due_on");
  const rows = data ?? [];
  const ids = rows.map((r) => r.id as string);
  const given = ids.length
    ? ((await db.from("vaccinations").select("schedule_id, administered_on").in("schedule_id", ids)).data ?? [])
    : [];
  const doneOn = new Map(given.map((g) => [g.schedule_id as string, g.administered_on as string]));
  return rows.map((r) => ({
    id: r.id as string, vaccineName: r.vaccine_name as string, dueOn: r.due_on as string,
    notes: (r.notes as string | null) ?? null, doneOn: doneOn.get(r.id as string) ?? null,
  }));
});

export interface ProgrammeItem {
  position: number;
  vaccineName: string;
  protectsAgainst: string;
  ageLabel: string;
  route: string;
  optional: boolean;
  atHatchery: boolean;
  source: string;
}

export const getProgramme = cache(async (): Promise<ProgrammeItem[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient().from("vaccine_programme_items").select("*").eq("programme", "layer-standard").order("position");
  return (data ?? []).map((r) => ({
    position: r.position as number, vaccineName: r.vaccine_name as string, protectsAgainst: r.protects_against as string,
    ageLabel: r.age_label as string, route: r.route as string, optional: r.optional as boolean,
    atHatchery: r.at_hatchery as boolean, source: r.source as string,
  }));
});

export const getHealthEvents = cache(async (flockId: string | null = null, limit = 40): Promise<import("@/lib/domain/health").HealthRecord[]> => {
  if (!isSupabaseConfigured()) return [];
  let q = createClient().from("health_events")
    .select("id, flock_id, observed_on, signs, birds_affected, notes, vet_findings, treatment, egg_hold_until, resolved_on")
    .order("observed_on", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  if (flockId) q = q.eq("flock_id", flockId);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id as string, flockId: r.flock_id as string, observedOn: r.observed_on as string, signs: (r.signs as string[]) ?? [],
    birdsAffected: (r.birds_affected as number | null) ?? null, notes: (r.notes as string | null) ?? null,
    vetFindings: (r.vet_findings as string | null) ?? null, treatment: (r.treatment as string | null) ?? null,
    eggHoldUntil: (r.egg_hold_until as string | null) ?? null, resolvedOn: (r.resolved_on as string | null) ?? null,
  }));
});
