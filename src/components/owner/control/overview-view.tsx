import { DataTable, SectionHeading, type Column } from "@/components/ui";
import { formatShortDate } from "@/lib/domain/dates";
import { formatPercent, pointsChange } from "@/lib/domain/metrics";
import {
  formatNgn,
  headline,
  moneySummary,
  type Alert,
  type FarmDay,
  type MoneyDay,
} from "@/lib/domain/overview";
import { formatCrates } from "@/lib/domain/units";
import { expectedEggsSeries } from "@/lib/domain/laying-curve";
import { flockEconomics, type FlockEconomics } from "@/lib/domain/flock-economics";
import type { EconomicsPool, ScorecardRow } from "@/lib/farm";
import { AlertsRail } from "./alerts-rail";
import { EstatePlan, type PlanFlock } from "./estate-plan";
import { NightStat, type NightDelta } from "./night-stat";
import { ProductionChart } from "./production-chart";

export interface OverviewViewProps {
  firstName: string;
  farmName?: string;
  today: string;
  nowHour: number;
  days: FarmDay[];
  money: MoneyDay[];
  scorecard: ScorecardRow[];
  plan: PlanFlock[];
  alerts: Alert[];
  /** Feed price and non-feed spending, for profit per flock. Omit to hide that section. */
  pool?: EconomicsPool;
  /** Birds and age of each active flock, to draw the breed standard. */
  flockAges?: { birds: number; ageDays: number }[];
}

const greeting = (h: number) => (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
const WINDOW = 30;

interface Ranked extends ScorecardRow {
  henDay: number | null;
  mortality: number | null;
  broken_: number | null;
  feedG: number | null;
}

const rank = (rows: ScorecardRow[]): Ranked[] =>
  rows
    .map((r) => ({
      ...r,
      henDay: r.eggDays > 0 && r.birds > 0 ? r.eggs / (r.birds * r.eggDays) : null,
      mortality: r.birds + r.deaths > 0 ? r.deaths / (r.birds + r.deaths) : null,
      broken_: r.eggs > 0 ? r.broken / r.eggs : null,
      feedG: r.birds > 0 ? (r.feedKg * 1000) / (r.birds * WINDOW) : null,
    }))
    .sort((a, b) => (b.henDay ?? -1) - (a.henDay ?? -1));

export function OverviewView(p: OverviewViewProps) {
  const h = headline(p.days);
  const eggs30 = p.days.reduce((s, d) => s + d.eggs, 0);
  const m = moneySummary(p.money, eggs30);
  const hasMoney = p.money.some((d) => d.salesNgn + d.invoicedNgn + d.expensesNgn > 0);

  const eggDelta: NightDelta | undefined =
    h.eggsToday !== null && h.eggsYesterday !== null
      ? {
          value: Math.abs(h.eggsToday - h.eggsYesterday).toLocaleString("en-NG"),
          direction: h.eggsToday > h.eggsYesterday ? "up" : h.eggsToday < h.eggsYesterday ? "down" : "flat",
          good: h.eggsToday === h.eggsYesterday ? null : h.eggsToday > h.eggsYesterday,
          against: "vs yesterday",
        }
      : undefined;
  const weekDelta: NightDelta | undefined =
    h.henDay7 !== null && h.henDayPrev7 !== null
      ? (() => {
          const pts = pointsChange(h.henDay7!, h.henDayPrev7!);
          return {
            value: `${Math.abs(pts).toFixed(1)} pts`,
            direction: pts > 0 ? "up" : pts < 0 ? "down" : "flat",
            good: pts === 0 ? null : pts > 0,
            against: "vs previous 7 days",
          } satisfies NightDelta;
        })()
      : undefined;

  const ranked = rank(p.scorecard);
  const table: Column<Ranked>[] = [
    {
      key: "flock",
      header: "Flock",
      className: "whitespace-nowrap",
      render: (r) => (
        <a href={`/flocks/${r.flockId}`} className="group flex flex-col">
          <span className="font-medium underline-offset-4 group-hover:underline">{r.name}</span>
          <span className="text-xs text-stone-600">{[r.breed, r.house].filter(Boolean).join(", ") || "-"}</span>
        </a>
      ),
    },
    { key: "hd", header: "Hen-day, 30 days", numeric: true, render: (r) => (r.henDay === null ? "-" : `${formatPercent(r.henDay)}%`) },
    { key: "mort", header: "Mortality", numeric: true, hideOnMobile: true, render: (r) => (r.mortality === null ? "-" : `${(r.mortality * 100).toFixed(2)}%`) },
    { key: "brk", header: "Broken", numeric: true, hideOnMobile: true, render: (r) => (r.broken_ === null ? "-" : `${(r.broken_ * 100).toFixed(1)}%`) },
    { key: "feed", header: "Feed g/bird/day", numeric: true, hideOnMobile: true, render: (r) => (r.feedG === null || r.feedKg === 0 ? "-" : Math.round(r.feedG)) },
    { key: "eggs", header: "Eggs", numeric: true, render: (r) => r.eggs.toLocaleString("en-NG") },
  ];

  const econ: FlockEconomics[] = p.pool
    ? flockEconomics(
        p.scorecard.map((r) => ({ flockId: r.flockId, name: r.name, birds: r.birds, eggs: r.eggs, feedKg: r.feedKg })),
        { revenueNgn: m.revenue, otherExpensesNgn: p.pool.otherExpensesNgn, feedCostPerKg: p.pool.feedCostPerKg },
      ).sort((a, b) => (b.marginNgn ?? -Infinity) - (a.marginNgn ?? -Infinity))
    : [];
  const econTable: Column<FlockEconomics>[] = [
    { key: "n", header: "Flock", className: "whitespace-nowrap", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "dz", header: "Feed kg per dozen", numeric: true, render: (r) => (r.feedKgPerDozen === null ? "-" : r.feedKgPerDozen.toFixed(2)) },
    { key: "fcr", header: "FCR", numeric: true, hideOnMobile: true, render: (r) => (r.fcr === null ? "-" : r.fcr.toFixed(2)) },
    { key: "c", header: "Cost per egg", numeric: true, hideOnMobile: true, render: (r) => (r.costPerEggNgn === null ? "-" : `N ${r.costPerEggNgn.toFixed(2)}`) },
    { key: "r", header: "Revenue (est.)", numeric: true, hideOnMobile: true, render: (r) => formatNgn(r.revenueNgn, true) },
    { key: "m", header: "Margin (est.)", numeric: true, render: (r) => (r.marginNgn === null ? "-" : <span className={r.marginNgn < 0 ? "text-attention-600" : undefined}>{formatNgn(r.marginNgn, true)}</span>) },
  ];

  return (
    <>
      <section aria-label="Control room" className="-mx-4 -mt-6 flex flex-col gap-10 border-y border-night-700 border-t border-t-signal-400/60 bg-night-900 px-4 py-8 text-night-100 md:-mx-8 md:px-8 lg:mx-0 lg:mt-0 lg:border lg:p-10">
        <header className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-xs font-medium text-night-300">
            <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-signal-400" />
            {formatShortDate(p.today)}{p.farmName ? ` / ${p.farmName}` : ""}
          </p>
          <h1 className="font-display text-2xl font-semibold text-night-100 md:text-3xl">
            {greeting(p.nowHour)}, {p.firstName}
          </h1>
        </header>

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 lg:gap-x-10">
          <NightStat label="Live birds" value={h.liveBirds.toLocaleString("en-NG")} note={`${p.plan.length} active ${p.plan.length === 1 ? "flock" : "flocks"}`} />
          <NightStat
            label="Eggs today"
            value={h.eggsToday === null ? "Not logged" : h.eggsToday.toLocaleString("en-NG")}
            text={h.eggsToday === null}
            delta={eggDelta}
            note={h.eggsToday === null ? "No collection recorded yet" : formatCrates(h.eggsToday)}
          />
          <NightStat
            label="Hen-day, 7 days"
            value={h.henDay7 === null ? "-" : formatPercent(h.henDay7)}
            unit={h.henDay7 === null ? undefined : "%"}
            delta={weekDelta}
          />
          <NightStat
            label="Mortality, 7 days"
            value={h.mortality7 === null ? "-" : (h.mortality7 * 100).toFixed(2)}
            unit={h.mortality7 === null ? undefined : "%"}
            note={`${h.deaths7.toLocaleString("en-NG")} ${h.deaths7 === 1 ? "bird" : "birds"} lost`}
          />
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-label="Production" className="flex flex-col gap-4 border-t border-night-600 pt-4">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl text-night-100">Egg production, last 30 days</h2>
              {h.feedGramsPerBird !== null ? (
                <span className="text-sm text-night-300">
                  Feed <span className="figure text-night-100">{Math.round(h.feedGramsPerBird)} g</span> per bird per day
                </span>
              ) : null}
            </header>
            <ProductionChart days={p.days} expected={p.flockAges ? expectedEggsSeries(p.days, p.flockAges, p.today) : undefined} />
          </section>
          <AlertsRail alerts={p.alerts} />
        </div>

        <section aria-label="Estate plan" className="flex flex-col gap-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-t border-night-600 pt-4">
            <h2 className="font-display text-xl text-night-100">Estate plan</h2>
            <span className="text-sm text-night-300">Every house today. Select a flock to open it.</span>
          </header>
          <EstatePlan flocks={p.plan} />
        </section>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading
          title="Money, last 30 days"
          description={hasMoney ? "Revenue is cash sales plus invoices issued. Collected is cash sales plus payments received." : "No sales or expenses recorded in this period."}
        />
        {hasMoney ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-5">
            <Money label="Revenue" value={formatNgn(m.revenue, true)} />
            <Money label="Expenses" value={formatNgn(m.expenses, true)} />
            <Money label="Margin" value={formatNgn(m.margin, true)} tone={m.margin < 0 ? "attention" : undefined} note={m.revenue > 0 ? `${((m.margin / m.revenue) * 100).toFixed(1)}% of revenue` : undefined} />
            <Money label="Collected" value={formatNgn(m.collected, true)} note={m.revenue > m.collected ? `${formatNgn(m.revenue - m.collected, true)} still owed` : undefined} />
            <Money label="Cost per egg" value={m.costPerEgg === null ? "-" : `N ${m.costPerEgg.toFixed(2)}`} note="All recorded costs" />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading title="Flock performance" description={`Ranked by hen-day production over the last ${WINDOW} days, counting only days with eggs recorded.`} />
        {ranked.length === 0 ? <p className="text-stone-700">No active flocks yet.</p> : <DataTable caption="Flock performance" columns={table} rows={ranked} rowKey={(r) => r.flockId} />}
      </section>

      {p.pool && econ.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Profit per flock"
            description={
              p.pool.feedCostPerKg === null
                ? "Record a feed purchase to see cost and margin per flock. Feed efficiency is shown without it."
                : `Estimated. Feed is each flock's own, at N ${Math.round(p.pool.feedCostPerKg)} per kg. Revenue is shared by eggs collected; other costs by birds. FCR assumes 60 g eggs.`
            }
          />
          <DataTable caption="Profit per flock" columns={econTable} rows={econ} rowKey={(r) => r.flockId} />
        </section>
      ) : null}
    </>
  );
}

function Money({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "attention" }) {
  return (
    <div className="rule-t flex flex-col gap-1 pt-3">
      <p className="eyebrow">{label}</p>
      <p className={`figure whitespace-nowrap text-2xl font-medium leading-none md:text-3xl ${tone === "attention" ? "text-attention-600" : "text-ink"}`}>{value}</p>
      {note ? <p className="text-sm text-stone-600">{note}</p> : null}
    </div>
  );
}
