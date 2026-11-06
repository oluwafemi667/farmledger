import type { AuditEntry } from "@/lib/farm";

const TABLE: Record<string, string> = {
  flocks: "Flock", sales: "Sale", expenses: "Expense", customers: "Customer", invoices: "Invoice",
  invoice_items: "Invoice line", payments: "Payment", feed_purchases: "Feed purchase",
  egg_stock_adjustments: "Egg stock adjustment", profiles: "Person", egg_collections: "Egg collection",
  mortality_logs: "Death record", feed_logs: "Feed record", vaccinations: "Vaccination",
  health_events: "Health record", vaccine_schedule: "Vaccine schedule",
};
const COLUMN: Record<string, string> = {
  name: "name", house: "house", breed: "breed", initial_count: "birds placed", placed_on: "placement date",
  status: "status", amount_ngn: "amount", due_on: "due date", role: "role", full_name: "name",
  eggs: "eggs", broken: "broken", birds: "birds", quantity_kg: "quantity (kg)", cost_ngn: "cost",
  description: "description", category: "category", signs: "signs seen", treatment: "treatment", vet_findings: "vet findings", egg_hold_until: "egg hold until", resolved_on: "resolved on", reason: "reason", notes: "notes", farm_id: "farm",
};

const HIDDEN = new Set(["id", "farm_id", "created_at", "created_by", "is_demo", "updated_at", "version", "invoice_seq"]);

const show = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "empty" : typeof v === "object" ? JSON.stringify(v) : String(v);

/** A plain sentence for each audit row, so the owner never reads JSON. */
export function describeAudit(e: Pick<AuditEntry, "table" | "action" | "changes">): { title: string; detail: string } {
  const what = TABLE[e.table] ?? e.table.replace(/_/g, " ");
  const label = (k: string) => COLUMN[k] ?? k.replace(/_/g, " ");

  if (e.action === "update") {
    const parts = Object.entries(e.changes)
      .filter(([k]) => !HIDDEN.has(k))
      .map(([k, v]) => {
        const c = v as { old?: unknown; new?: unknown };
        return `${label(k)}: ${show(c.old)} to ${show(c.new)}`;
      });
    return { title: `${what} changed`, detail: parts.join("; ") || "No visible fields changed." };
  }
  const row = e.changes as Record<string, unknown>;
  const name = (row.name ?? row.full_name ?? row.number ?? row.description ?? row.feed_type ?? row.reason) as string | undefined;
  const amount = row.amount_ngn ?? row.cost_ngn;
  const bits = [name, amount !== undefined ? `N ${Number(amount).toLocaleString("en-NG")}` : null].filter(Boolean);
  return {
    title: `${what} ${e.action === "insert" ? "added" : "deleted"}`,
    detail: bits.join(", ") || "",
  };
}
