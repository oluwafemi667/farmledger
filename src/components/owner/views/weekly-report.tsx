import type { ReactNode } from "react";
import { PageHeader, SectionHeading } from "@/components/ui";
import { ProductionChart } from "@/components/owner/control/production-chart";
import { formatShortDate } from "@/lib/domain/dates";
import type { Briefing } from "@/lib/domain/briefing";
import { formatPercent } from "@/lib/domain/metrics";
import { formatNgn, headline, moneySummary, type FarmDay, type MoneyDay } from "@/lib/domain/overview";
import type { ScorecardRow } from "@/lib/farm";

const tint = { good: "bg-signal-500", watch: "bg-wheat-500", attention: "bg-attention-500" } as const;

/**
 * One page for the owner, a partner or the bank. Prints in the light theme.
 * Everything here is computed from the same functions as the Overview, so the
 * numbers on paper always match the numbers on screen.
 */
export function WeeklyReport({
  farmName, from, to, days, money, scorecard, briefing, expected, owed, actions,
}: {
  farmName?: string; from: string; to: string; days: FarmDay[]; money: MoneyDay[]; scorecard: ScorecardRow[];
  briefing: Briefing; expected?: (number | null)[]; owed: number; actions: ReactNode;
}) {
  const h = headline(days);
  const week = days.slice(-7);
  const eggsWeek = week.reduce((s, d) => s + d.eggs, 0);
  const m = moneySummary(money, eggsWeek);
  const fig: [string, string, string?][] = [
    ["Eggs this week", eggsWeek.toLocaleString("en-NG")],
    ["Hen-day, 7 days", h.henDay7 === null ? "-" : `${formatPercent(h.henDay7)}%`, h.henDayPrev7 === null ? undefined : `Week before ${formatPercent(h.henDayPrev7)}%`],
    ["Birds lost", String(h.deaths7), h.mortality7 === null ? undefined : `${(h.mortality7 * 100).toFixed(2)}% of flock`],
    ["Live birds", h.liveBirds.toLocaleString("en-NG")],
    ["Revenue", formatNgn(m.revenue, true)],
    ["Expenses", formatNgn(m.expenses, true)],
    ["Margin", formatNgn(m.margin, true)],
    ["Still owed to you", formatNgn(owed, true)],
  ];
  return (
    <>
      <PageHeader eyebrow={`Weekly report${farmName ? `, ${farmName}` : ""}`} title={`${formatShortDate(from)} to ${formatShortDate(to)}`} description="Production, money and what needs attention." actions={actions} />
      <section className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
        {fig.map(([l, v, n]) => (
          <div key={l} className="rule-t flex flex-col gap-1 pt-3">
            <p className="eyebrow">{l}</p>
            <p className="figure text-2xl font-medium leading-none">{v}</p>
            {n ? <p className="text-xs text-stone-600">{n}</p> : null}
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-3 break-inside-avoid">
        <SectionHeading title="What to know" />
        <ul className="flex flex-col gap-2">
          {briefing.lines.map((l, i) => (
            <li key={i} className="flex gap-3"><span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tint[l.tone]}`} /><span>{l.text}</span></li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3 break-inside-avoid">
        <SectionHeading title="Egg production, 30 days" />
        <ProductionChart days={days} expected={expected} paper />
      </section>
      <section className="flex flex-col gap-3 break-inside-avoid">
        <SectionHeading title="Flocks this week" />
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ivory-400 text-left"><th className="py-2 font-medium">Flock</th><th className="py-2 text-right font-medium">Birds</th><th className="py-2 text-right font-medium">Eggs</th><th className="py-2 text-right font-medium">Deaths</th><th className="py-2 text-right font-medium">Feed kg</th></tr></thead>
          <tbody>
            {scorecard.map((r) => (
              <tr key={r.flockId} className="border-b border-ivory-300">
                <td className="py-2">{r.name}<span className="text-stone-600">{r.house ? `, ${r.house}` : ""}</span></td>
                <td className="figure py-2 text-right">{r.birds.toLocaleString("en-NG")}</td>
                <td className="figure py-2 text-right">{r.eggs.toLocaleString("en-NG")}</td>
                <td className="figure py-2 text-right">{r.deaths}</td>
                <td className="figure py-2 text-right">{Math.round(r.feedKg).toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
