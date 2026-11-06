import type { Metadata } from "next";
import { Printer } from "lucide-react";
import { PrintButtonHook } from "@/components/owner/print-hook";
import { WeeklyReport } from "@/components/owner/views/weekly-report";
import { buildBriefing } from "@/lib/domain/briefing";
import { addDays } from "@/lib/domain/dates";
import { expectedEggsSeries } from "@/lib/domain/laying-curve";
import { buildAlerts } from "@/lib/domain/overview";
import { invoiceState } from "@/lib/domain/receivables";
import { getDaySummaries, getFarm, getFarmDaily, getFeedPosition, getFlocks, getInvoices, getMoneyDaily, getScorecard, getToday } from "@/lib/farm";

export const metadata: Metadata = { title: "Weekly report" };

export default async function WeeklyReportPage() {
  const today = await getToday();
  const [farm, days, money7, flocks, summaries, invoices, feed, scorecard] = await Promise.all([
    getFarm(), getFarmDaily(30, today), getMoneyDaily(7, today), getFlocks(), getDaySummaries(today),
    getInvoices(500), getFeedPosition(today), getScorecard(7, today),
  ]);
  const alerts = buildAlerts(
    flocks.map((f) => {
      const d = summaries[f.id];
      return { id: f.id, name: f.name, activeBirds: f.activeBirds, eggsToday: d && d.eggEntries > 0 ? d.eggs : null, eggsYesterday: d?.eggsPrev ?? 0, deathsToday: d?.deaths ?? 0, vaccinesOverdue: d?.vaccinesOverdue ?? 0, nextVaccineName: d?.nextVaccineName ?? null };
    }),
    { nowHour: 0 },
  );
  const overdue = invoices.filter((i) => invoiceState(i, today) === "overdue");
  const owed = invoices.filter((i) => i.status === "issued").reduce((s, i) => s + i.balanceNgn, 0);
  const briefing = buildBriefing({
    days, money: money7, alerts,
    overdueInvoices: { count: overdue.length, totalNgn: overdue.reduce((s, i) => s + i.balanceNgn, 0) },
    lowFeedTypes: feed.filter((f) => f.daysLeft !== null && f.daysLeft <= 7).map((f) => f.feedType),
  });
  return (
    <>
      <WeeklyReport
        farmName={farm?.name} from={addDays(today, -6)} to={today} days={days} money={money7} scorecard={scorecard} briefing={briefing} owed={owed}
        expected={expectedEggsSeries(days, flocks.map((f) => ({ birds: f.activeBirds, ageDays: f.ageDays })), today)}
        actions={<button type="button" data-print className="inline-flex min-h-11 items-center gap-2 rounded bg-signal-500 px-4 text-sm font-semibold text-night-950 hover:bg-signal-400 print:hidden"><Printer className="h-4 w-4" aria-hidden /> Print or save as PDF</button>}
      />
      <PrintButtonHook />
    </>
  );
}
