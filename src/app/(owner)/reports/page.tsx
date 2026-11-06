import type { Metadata } from "next";
import { ReportsView } from "@/components/owner/views/reports-view";
import { PrintButtonHook } from "@/components/owner/print-hook";
import { buildBriefing } from "@/lib/domain/briefing";
import { buildAlerts } from "@/lib/domain/overview";
import { invoiceState } from "@/lib/domain/receivables";
import { getDaySummaries, getFarmDaily, getFeedPosition, getFlocks, getInvoices, getMoneyDaily, getToday } from "@/lib/farm";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const today = await getToday();
  const [days, money, flocks, summaries, invoices, feed] = await Promise.all([
    getFarmDaily(30, today), getMoneyDaily(30, today), getFlocks(), getDaySummaries(today), getInvoices(500), getFeedPosition(today),
  ]);
  const alerts = buildAlerts(
    flocks.map((f) => {
      const d = summaries[f.id];
      return { id: f.id, name: f.name, activeBirds: f.activeBirds, eggsToday: d && d.eggEntries > 0 ? d.eggs : null, eggsYesterday: d?.eggsPrev ?? 0, deathsToday: d?.deaths ?? 0, vaccinesOverdue: d?.vaccinesOverdue ?? 0, nextVaccineName: d?.nextVaccineName ?? null };
    }),
    { nowHour: 0 },
  );
  const overdue = invoices.filter((i) => invoiceState(i, today) === "overdue");
  const briefing = buildBriefing({
    days, money, alerts,
    overdueInvoices: { count: overdue.length, totalNgn: overdue.reduce((s, i) => s + i.balanceNgn, 0) },
    lowFeedTypes: feed.filter((f) => f.daysLeft !== null && f.daysLeft <= 7).map((f) => f.feedType),
  });
  const dateLabel = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (<><ReportsView briefing={briefing} dateLabel={dateLabel} /><PrintButtonHook /></>);
}
