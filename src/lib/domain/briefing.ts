import { addDays } from "./dates";
import { formatNgn, headline, moneySummary, type Alert, type FarmDay, type MoneyDay } from "./overview";

export interface BriefingInput {
  days: FarmDay[];
  money: MoneyDay[];
  alerts: Alert[];
  overdueInvoices: { count: number; totalNgn: number };
  lowFeedTypes: string[];
}

export interface Briefing {
  lines: { tone: "good" | "watch" | "attention"; text: string }[];
}

const pct = (v: number | null) => (v === null ? "no data" : `${(v * 100).toFixed(1)}%`);

/**
 * A morning briefing built only from rules over the farm's own numbers, so
 * every sentence can be traced to a figure on another screen. No model writes
 * these lines, which means none of them can be invented.
 */
export function buildBriefing(i: BriefingInput): Briefing {
  const lines: Briefing["lines"] = [];
  const h = headline(i.days);
  const m = moneySummary(i.money, i.days.reduce((s, d) => s + d.eggs, 0));

  if (h.henDay7 !== null) {
    const delta = h.henDayPrev7 !== null ? h.henDay7 - h.henDayPrev7 : null;
    if (delta !== null && delta <= -0.03) {
      lines.push({ tone: "attention", text: `Laying rate is ${pct(h.henDay7)} over the last 7 days, down ${(Math.abs(delta) * 100).toFixed(1)} points on the week before. Check feed, water and house temperature first.` });
    } else if (delta !== null && delta >= 0.02) {
      lines.push({ tone: "good", text: `Laying rate is ${pct(h.henDay7)} over the last 7 days, up ${(delta * 100).toFixed(1)} points on the week before.` });
    } else {
      lines.push({ tone: "good", text: `Laying rate is steady at ${pct(h.henDay7)} over the last 7 days.` });
    }
  } else {
    lines.push({ tone: "watch", text: "There are not enough egg records in the last 7 days to work out a laying rate." });
  }

  if (h.mortality7 !== null && h.deaths7 > 0) {
    lines.push({ tone: h.mortality7 > 0.005 ? "attention" : "watch", text: `${h.deaths7} bird${h.deaths7 === 1 ? "" : "s"} lost in the last 7 days (${(h.mortality7 * 100).toFixed(2)}% of the flock).` });
  }

  if (m.revenue > 0 || m.expenses > 0) {
    lines.push({
      tone: m.margin < 0 ? "attention" : "good",
      text: `Over 30 days: ${formatNgn(m.revenue, true)} earned, ${formatNgn(m.expenses, true)} spent, so ${m.margin < 0 ? "a loss of " : "a margin of "}${formatNgn(Math.abs(m.margin), true)}.${m.costPerEgg !== null ? ` Recorded cost per egg is ${formatNgn(m.costPerEgg)}.` : ""}`,
    });
  }

  if (i.overdueInvoices.count > 0) {
    lines.push({ tone: "attention", text: `${i.overdueInvoices.count} invoice${i.overdueInvoices.count === 1 ? " is" : "s are"} overdue, ${formatNgn(i.overdueInvoices.totalNgn)} in all. Chasing these is the quickest cash you can recover.` });
  }
  if (i.lowFeedTypes.length > 0) {
    lines.push({ tone: "attention", text: `Feed is running low for: ${i.lowFeedTypes.join(", ")}. Order before it runs out.` });
  }
  for (const a of i.alerts.slice(0, 3)) lines.push({ tone: a.level === "attention" ? "attention" : "watch", text: `${a.title}. ${a.detail}` });

  return { lines };
}

/** Date label used in report file names. */
export const reportName = (kind: string, to: string, days: number) => `farmledger-${kind}-${addDays(to, -(days - 1))}-to-${to}.csv`;
