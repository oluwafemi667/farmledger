import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/ui";
import { EditFlockForm } from "@/components/owner/flock-form";
import { FlockDetail } from "@/components/owner/flock-detail";
import { HealthSection, ProgrammeSection } from "@/components/owner/care/care-sections";
import { activeEggHold } from "@/lib/domain/health";
import {
  getDaySummaries,
  getFlockDaily,
  getFlockRecord,
  getFlocks,
  getFlockSchedule,
  getFlockSummary,
  getFlockVaccinations,
  getHealthEvents,
  getProgramme,
  getToday,
} from "@/lib/farm";

export const metadata: Metadata = { title: "Flock" };

export default async function FlockPage({ params }: { params: { id: string } }) {
  const today = await getToday();
  const [summary, record, daily, vaccinations, days, flocks, schedule, programme, health] = await Promise.all([
    getFlockSummary(params.id),
    getFlockRecord(params.id),
    getFlockDaily(params.id, 14, today),
    getFlockVaccinations(params.id),
    getDaySummaries(today),
    getFlocks(),
    getFlockSchedule(params.id),
    getProgramme(),
    getHealthEvents(params.id),
  ]);
  if (!summary || !record) notFound();

  return (
    <>
      <FlockDetail
        flock={summary}
        placedOn={record.placedOn}
        today={today}
        day={days[params.id]}
        daily={daily}
        vaccinations={vaccinations}
      >
        <HealthSection flockId={record.id} events={health} holdUntil={activeEggHold(health, record.id, today)} />
        <ProgrammeSection flockId={record.id} flockName={summary.name} schedule={schedule} programme={programme} today={today} />
        <section className="flex flex-col gap-6">
          <SectionHeading
            title="Edit details"
            description="Changing the number of birds placed changes the live bird count."
          />
          <EditFlockForm
            flock={record}
            otherNames={flocks.filter((f) => f.id !== record.id).map((f) => f.name)}
          />
        </section>
      </FlockDetail>
    </>
  );
}
