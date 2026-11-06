import type { Metadata } from "next";
import { OwnerShell } from "@/components/owner/owner-shell";
import { OverviewView } from "@/components/owner/control/overview-view";
import type { PlanFlock } from "@/components/owner/control/estate-plan";
import { addDays } from "@/lib/domain/dates";
import { buildAlerts, type FarmDay, type MoneyDay } from "@/lib/domain/overview";
import type { ScorecardRow } from "@/lib/farm";

export const metadata: Metadata = { title: "Control room preview" };

// Demonstration data only. Nothing here is read from a database.
const TODAY = "2026-11-03";

const days: FarmDay[] = Array.from({ length: 30 }, (_, i) => {
  const day = addDays(TODAY, -(29 - i));
  const wave = Math.round(Math.sin(i / 3.2) * 28);
  const fade = i > 24 ? (i - 24) * 22 : 0;
  const logged = i !== 11 && i !== 19 && i !== 29;
  return {
    day,
    birds: 2700 - Math.floor(i / 6) * 4 - (i > 24 ? 6 : 0),
    eggs: logged ? 2330 + wave - fade : 0,
    broken: logged ? 14 + (i % 5) : 0,
    deaths: i > 24 ? (i === 27 ? 5 : 2) : i % 9 === 0 ? 1 : 0,
    feedKg: 305 + (i % 4) * 3,
  };
});

const money: MoneyDay[] = days.map((d, i) => ({
  day: d.day,
  salesNgn: i % 3 === 0 ? 410000 : 0,
  invoicedNgn: i % 5 === 0 ? 1250000 : 0,
  collectedNgn: i % 7 === 0 ? 980000 : 0,
  expensesNgn: i % 4 === 0 ? 1180000 : 120000,
}));

const scorecard: ScorecardRow[] = [
  { flockId: "a", name: "Flock A", breed: "Isa Brown", house: "House 1", birds: 1180, eggs: 29200, broken: 410, eggDays: 28, deaths: 9, feedKg: 4380 },
  { flockId: "b", name: "Flock B", breed: "Isa Brown", house: "House 2", birds: 962, eggs: 22100, broken: 380, eggDays: 28, deaths: 31, feedKg: 3610 },
  { flockId: "c", name: "Flock C", breed: "Lohmann Brown", house: "House 3", birds: 558, eggs: 14300, broken: 150, eggDays: 28, deaths: 3, feedKg: 2020 },
];

const plan: PlanFlock[] = [
  { id: "a", name: "Flock A", breed: "Isa Brown", house: "House 1", birds: 1180, henDay: 0.858, state: "ok" },
  { id: "b", name: "Flock B", breed: "Isa Brown", house: "House 2", birds: 962, henDay: 0.834, state: "attention", note: "Vaccine overdue" },
  { id: "c", name: "Flock C", breed: "Lohmann Brown", house: "House 3", birds: 558, henDay: 0.844, state: "ok" },
  { id: "d", name: "Flock D", breed: "Hy-Line Brown", house: "House 4", birds: 940, henDay: null, state: "unlogged" },
];

const alerts = buildAlerts(
  [
    { id: "b", name: "Flock B", activeBirds: 962, eggsToday: 802, eggsYesterday: 861, deathsToday: 4, vaccinesOverdue: 1, nextVaccineName: "Infectious bronchitis" },
    { id: "d", name: "Flock D", activeBirds: 940, eggsToday: null, eggsYesterday: 790, deathsToday: 0, vaccinesOverdue: 0, nextVaccineName: null },
  ],
  { nowHour: 16 },
);

export default function ControlPreviewPage() {
  return (
    <OwnerShell profile={{ fullName: "Femi Ajayi", role: "owner", farmId: "x", userId: "u" } as never} farmName="Demo Farm (sample data)" isDemo>
      <OverviewView firstName="Femi" farmName="Demo Farm" today={TODAY} nowHour={16} days={days} money={money} scorecard={scorecard} plan={plan} alerts={alerts} flockAges={[{ birds: 1180, ageDays: 38 * 7 }, { birds: 962, ageDays: 38 * 7 }, { birds: 558, ageDays: 19 * 7 + 45 }]} pool={{ feedCostPerKg: 520, otherExpensesNgn: 1_450_000 }} />
    </OwnerShell>
  );
}
