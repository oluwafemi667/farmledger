import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import {
  DataTable,
  EmptyState,
  LedgerStat,
  PageHeader,
  SectionHeading,
  StatusChip,
  type Column,
  type Delta,
} from "@/components/ui";
import type {
  DailyRow,
  FlockSummary,
  VaccinationRecord,
} from "@/lib/farm";
import { formatAge, formatShortDate } from "@/lib/domain/dates";
import { feedGramsPerBird, formatPercent, henDayRate, pointsChange } from "@/lib/domain/metrics";
import { formatCrates } from "@/lib/domain/units";
import { expectedHenDay } from "@/lib/domain/laying-curve";
import { dueLabel } from "@/lib/domain/vaccine";
import type { DaySummary } from "@/types/domain";

const dash = <span className="text-stone-500">-</span>;

const dailyColumns: Column<DailyRow>[] = [
  { key: "day", header: "Day", className: "whitespace-nowrap", render: (r) => formatShortDate(r.day) },
  { key: "eggs", header: "Eggs", numeric: true, render: (r) => (r.eggs > 0 ? r.eggs.toLocaleString("en-NG") : dash) },
  { key: "broken", header: "Broken", numeric: true, hideOnMobile: true, render: (r) => (r.eggs > 0 ? r.broken : dash) },
  { key: "deaths", header: "Deaths", numeric: true, render: (r) => r.deaths },
  {
    key: "feed",
    header: "Feed (kg)",
    numeric: true,
    render: (r) => (r.feedKg > 0 ? r.feedKg.toLocaleString("en-NG", { maximumFractionDigits: 1 }) : dash),
  },
];

const vaccinationColumns: Column<VaccinationRecord>[] = [
  { key: "date", header: "Given", className: "whitespace-nowrap", render: (r) => formatShortDate(r.administeredOn) },
  { key: "name", header: "Vaccine", render: (r) => <span className="font-medium">{r.vaccineName}</span> },
  { key: "method", header: "Method", hideOnMobile: true, render: (r) => r.method ?? dash },
  { key: "batch", header: "Batch", hideOnMobile: true, render: (r) => r.batchNumber ?? dash },
];

/**
 * A flock's own page: the facts that define it, how it has done recently, and
 * its vaccination history. The edit form is passed in so this view stays free
 * of data fetching and can be previewed on sample data.
 */
export function FlockDetail({
  flock,
  placedOn,
  today,
  day,
  daily,
  vaccinations,
  children,
}: {
  flock: FlockSummary;
  placedOn: string;
  today: string;
  day: DaySummary | undefined;
  daily: DailyRow[];
  vaccinations: VaccinationRecord[];
  children?: ReactNode;
}) {
  const loggedToday = !!day && day.eggEntries > 0;
  const rateToday = loggedToday ? henDayRate(day.eggs, flock.activeBirds) : null;
  const ratePrev =
    day && day.eggsPrev > 0 ? henDayRate(day.eggsPrev, flock.activeBirds) : null;

  let delta: Delta | undefined;
  if (rateToday !== null && ratePrev !== null) {
    const pts = pointsChange(rateToday, ratePrev);
    delta = {
      value: `${Math.abs(pts).toFixed(1)} pts`,
      direction: pts > 0 ? "up" : pts < 0 ? "down" : "flat",
      tone: pts < 0 ? "attention" : pts > 0 ? "positive" : "neutral",
      against: "vs yesterday",
    };
  }

  const deaths14 = daily.reduce((n, r) => n + r.deaths, 0);
  const grams = day && day.feedKg > 0 ? feedGramsPerBird(day.feedKg, flock.activeBirds) : null;
  const lost = flock.initialCount - flock.activeBirds;
  const standard = expectedHenDay(flock.ageDays);

  return (
    <>
      <PageHeader
        eyebrow="Flock"
        title={flock.name}
        description={[flock.breed, flock.house].filter(Boolean).join(", ") || undefined}
      />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4">
        <LedgerStat
          label="Live birds"
          value={flock.activeBirds.toLocaleString("en-NG")}
          note={`Placed ${flock.initialCount.toLocaleString("en-NG")}, lost ${lost.toLocaleString("en-NG")}`}
        />
        <LedgerStat
          label="Age"
          value={formatAge(flock.ageDays)}
          note={`Placed ${formatShortDate(placedOn)}`}
        />
        <LedgerStat
          label="Hen-day today"
          value={rateToday === null ? "Not logged" : formatPercent(rateToday)}
          unit={rateToday === null ? undefined : "%"}
          delta={delta}
          note={[loggedToday ? `${formatCrates(day.eggs)} today` : "No eggs recorded yet today", standard !== null ? `Breed standard at this age: ${formatPercent(standard)}%` : null].filter(Boolean).join(". ")}
        />
        <LedgerStat
          label="Deaths, 14 days"
          value={String(deaths14)}
          unit="birds"
          note={grams !== null ? `Feed today: ${Math.round(grams)} g per bird` : undefined}
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading
          title="Last 14 days"
          description="A dash means nothing was recorded that day, which is not the same as zero."
        />
        <DataTable
          caption={`Daily records for ${flock.name}, last 14 days`}
          columns={dailyColumns}
          rows={daily}
          rowKey={(r) => r.day}
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Vaccinations" />
        {day?.nextVaccineName && day.nextVaccineDue ? (
          <p className="flex flex-wrap items-center gap-2 text-base">
            <span className="text-stone-700">Next:</span>
            <span className="font-medium">{day.nextVaccineName}</span>
            <StatusChip tone={day.nextVaccineDue < today ? "attention" : "neutral"}>
              {dueLabel(day.nextVaccineDue, today)}
            </StatusChip>
          </p>
        ) : null}
        <DataTable
          caption={`Vaccination records for ${flock.name}`}
          columns={vaccinationColumns}
          rows={vaccinations}
          rowKey={(r) => r.id}
          empty={
            <EmptyState
              icon={ShieldCheck}
              title="No vaccinations recorded"
              description="Doses recorded by the team appear here, newest first."
            />
          }
        />
      </section>

      {children}
    </>
  );
}
