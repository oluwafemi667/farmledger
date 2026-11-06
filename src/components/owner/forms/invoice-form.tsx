"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Input, Notice, Select } from "@/components/ui";
import { createInvoice } from "@/app/(owner)/sales/actions";
import { EGG_GRADES, SALE_CATEGORIES, gradeLabel, invoiceSchema, invoiceTotal, saleLabel, type ActionResult } from "@/lib/domain/commerce";
import { addDays, todayIn } from "@/lib/domain/dates";
import { parseWith } from "@/lib/domain/schemas";
import { formatNgn } from "@/lib/domain/overview";
import { lastPrice, type PriceHistoryRow } from "@/lib/domain/statement";
import { num, str } from "./record-form";

interface Line { category: string; description: string; grade: string; quantity: string; unit: string; price: string }
const blankLine = (): Line => ({ category: "eggs", description: "", grade: "", quantity: "", unit: "crate", price: "" });

/** Builds an invoice from lines. The total shown is computed the same way the database does. */
export function InvoiceForm({
  customers,
  priceHistory = [],
  save = createInvoice,
  onDone,
}: {
  customers: { id: string; name: string }[];
  /** Past prices, so the form can say what this customer paid last time. */
  priceHistory?: PriceHistoryRow[];
  save?: (raw: unknown) => Promise<ActionResult>;
  onDone?: (id?: string) => void;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [issuedOn, setIssuedOn] = useState(todayIn());
  const [dueOn, setDueOn] = useState(addDays(todayIn(), 14));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const raw = () => ({
    customerId: customerId || undefined, issuedOn, dueOn, notes,
    lines: lines.map((l) => ({
      category: l.category, description: l.description, grade: str(l.grade),
      quantity: num(l.quantity), unit: l.unit, unitPriceNgn: num(l.price),
    })),
  });
  const parsed = parseWith(invoiceSchema(todayIn()), raw());
  const errors: Record<string, string> = { ...serverErrors, ...(attempted && !parsed.ok ? parsed.errors : {}) };
  const total = invoiceTotal(lines.map((l) => ({ quantity: num(l.quantity) ?? 0, unitPriceNgn: num(l.price) ?? 0 })));

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  function submit() {
    if (pending) return;
    setAttempted(true);
    setFailure(null);
    if (!parsed.ok) return;
    setServerErrors({});
    start(async () => {
      try {
        const r = await save(parsed.data);
        if (r.status === "saved") {
          if (onDone) onDone(r.id);
          else router.push(r.id ? `/sales/invoices/${r.id}` : "/sales");
        } else if (r.status === "invalid") setServerErrors(r.errors);
        else setFailure(r.message);
      } catch {
        setFailure("Could not reach the server. Your invoice is still here.");
      }
    });
  }

  return (
    <form noValidate className="flex max-w-4xl flex-col gap-8" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-3">
        <div className="md:col-span-1">
          <Select label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} error={errors.customerId} disabled={pending}
            hint={customers.length === 0 ? "Add a customer first." : undefined}>
            <option value="">Choose a customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Link href="/sales/customers" className="mt-1 inline-block text-sm text-forest-800 underline underline-offset-4">Add a new customer</Link>
        </div>
        <Input label="Invoice date" type="date" value={issuedOn} max={todayIn()} onChange={(e) => setIssuedOn(e.target.value)} error={errors.issuedOn} disabled={pending} />
        <Input label="Payment due" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} error={errors.dueOn} disabled={pending} />
      </div>

      <section aria-label="Lines" className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Lines</h3>
        {lines.map((l, i) => (
          <fieldset key={i} className="grid gap-x-4 gap-y-4 border-t border-ivory-300 pt-4 md:grid-cols-6" disabled={pending}>
            <legend className="sr-only">Line {i + 1}</legend>
            <div className="md:col-span-2">
              <Select label="Item" value={l.category} onChange={(e) => setLine(i, { category: e.target.value, unit: e.target.value === "eggs" ? "crate" : l.unit })}>
                {SALE_CATEGORIES.map((c) => <option key={c} value={c}>{saleLabel[c]}</option>)}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select label="Egg size" optional value={l.grade} onChange={(e) => setLine(i, { grade: e.target.value })}>
                <option value="">Not applicable</option>
                {EGG_GRADES.map((g) => <option key={g} value={g}>{gradeLabel[g]}</option>)}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Input label="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} autoComplete="off" />
            </div>
            <Input label="Quantity" inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} autoComplete="off" />
            <Input label="Unit" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} autoComplete="off" />
            <div className="flex flex-col gap-1">
              <Input label="Price per unit (N)" inputMode="decimal" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} autoComplete="off" />
              {(() => {
                const last = customerId ? lastPrice(priceHistory, { customerId, category: l.category, grade: str(l.grade) ?? null, unit: l.unit }) : null;
                if (!last || String(last.unitPriceNgn) === l.price) return null;
                return (
                  <button type="button" onClick={() => setLine(i, { price: String(last.unitPriceNgn) })} className="w-fit text-left text-xs text-forest-800 underline underline-offset-4">
                    Last charged {formatNgn(last.unitPriceNgn)} per {last.unit}. Use it
                  </button>
                );
              })()}
            </div>
            <div className="flex items-end justify-between gap-3 md:col-span-3">
              <p className="text-sm text-stone-700">Line total <span className="figure text-ink">{formatNgn(Math.round((num(l.quantity) ?? 0) * (num(l.price) ?? 0) * 100) / 100)}</span></p>
              {lines.length > 1 ? (
                <Button variant="ghost" type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove
                </Button>
              ) : null}
            </div>
          </fieldset>
        ))}
        {errors.lines ? <p role="alert" className="text-sm text-danger-600">{errors.lines}</p> : null}
        <div>
          <Button variant="secondary" type="button" onClick={() => setLines((ls) => [...ls, blankLine()])} disabled={lines.length >= 50}>
            <Plus className="h-4 w-4" aria-hidden /> Add a line
          </Button>
        </div>
      </section>

      <Input label="Note on the invoice" optional value={notes} onChange={(e) => setNotes(e.target.value)} disabled={pending} autoComplete="off" />

      {errors.form ? <Notice tone="danger" title="Could not create the invoice">{errors.form}</Notice> : null}
      {failure ? <Notice tone="danger" title="Not saved">{failure}</Notice> : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ivory-300 pt-4">
        <p className="text-lg">Total <span className="figure text-2xl font-medium">{formatNgn(total)}</span></p>
        <Button type="submit" loading={pending}>{pending ? "Creating" : "Create invoice"}</Button>
      </div>
    </form>
  );
}
