import type { Metadata } from "next";
import { Sprout } from "lucide-react";
import { EmptyState, LinkButton } from "@/components/ui";
import { OverviewView } from "@/components/owner/control/overview-view";
import type { PlanFlock } from "@/components/owner/control/estate-plan";
import { requireProfile } from "@/lib/auth/session";
import { addDays, FARM_TIMEZONE } from "@/lib/domain/dates";
import { buildAlerts } from "@/lib/domain/overview";
import { careAlerts } from "@/lib/domain/warnings";
import { henDayRate } from "@/lib/domain/metrics";
import {
  getDaySummaries,
  getFarm,
  getFarmDaily,
  getEconomicsPool,
  getFlockDaily,
  getFlocks,
  getHealthEvents,
  getMoneyDaily,
  getScorecard,
  getToday,
} from "@/lib/farm";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const profile = await requireProfile("owner");
  const today = await getToday();
  const [farm, flocks, summaries, days, money, scorecard, pool, events] = await Promise.all([
    getFarm(),
    getFlocks(),
    getDaySummaries(today),
    getFarmDaily(30, today),
    getMoneyDaily(30, today),
    getScorecard(30, today),
    getEconomicsPool(addDays(today, -29), today),
    getHealthEvents(null, 60),
  ]);

  if (flocks.length === 0) {
    return (
      <EmptyState
        icon={Sprout}
        title="No flocks yet"
        description="Add your first flock and the control room fills in as the team records eggs, deaths and feed."
        action={<LinkButton href="/flocks/new">Add flock</LinkButton>}
      />
    );
  }

  const nowHour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: farm?.timezone ?? FARM_TIMEZONE }).format(new Date()),
  ) % 24;

  const plan: PlanFlock[] = flocks.map((f) => {
    const d = summaries[f.id];
    const logged = !!d && d.eggEntries > 0;
    const attention = (d?.vaccinesOverdue ?? 0) > 0 || (d?.deaths ?? 0) >= 3;
    return {
      id: f.id,
      name: f.name,
      breed: f.breed,
      house: f.house,
      birds: f.activeBirds,
      henDay: logged ? henDayRate(d.eggs, f.activeBirds) : null,
      state: attention ? "attention" : logged ? "ok" : "unlogged",
      note: (d?.vaccinesOverdue ?? 0) > 0 ? "Vaccine overdue" : (d?.deaths ?? 0) >= 3 ? `${d.deaths} deaths today` : undefined,
    };
  });

  const flockDaily = Object.fromEntries(
    await Promise.all(flocks.map(async (f) => [f.id, await getFlockDaily(f.id, 10, today)] as const)),
  );
  const care = careAlerts({ flocks, daily: flockDaily, events, today });

  const rules = buildAlerts(
    flocks.map((f) => {
      const d = summaries[f.id];
      return {
        id: f.id,
        name: f.name,
        activeBirds: f.activeBirds,
        eggsToday: d && d.eggEntries > 0 ? d.eggs : null,
        eggsYesterday: d?.eggsPrev ?? 0,
        deathsToday: d?.deaths ?? 0,
        vaccinesOverdue: d?.vaccinesOverdue ?? 0,
        nextVaccineName: d?.nextVaccineName ?? null,
      };
    }),
    { nowHour },
  );
  const alerts = [...care, ...rules].sort((a, b) => (a.level === b.level ? 0 : a.level === "attention" ? -1 : 1));

  return (
    <OverviewView
      firstName={profile.fullName.split(" ")[0]}
      farmName={farm?.name}
      today={today}
      nowHour={nowHour}
      days={days}
      money={money}
      scorecard={scorecard}
      plan={plan}
      alerts={alerts}
      pool={pool}
      flockAges={flocks.map((f) => ({ birds: f.activeBirds, ageDays: f.ageDays }))}
    />
  );
}
