"use client";

import { useMemo } from "react";
import { EditFlockForm, NewFlockForm } from "@/components/owner/flock-form";
import { FlockDetail } from "@/components/owner/flock-detail";
import { FlockDirectory, type FlockRow } from "@/components/owner/flock-directory";
import { SectionHeading } from "@/components/ui";
import type { LogRepository } from "@/lib/data/log-repository";
import type { DaySummary } from "@/types/domain";
import type { DailyRow, FlockRecord, FlockSummary, VaccinationRecord } from "@/lib/farm";

// Demonstration data only. Nothing here is read from, or written to, a database.
const FARM = "00000000-0000-4000-8000-00000000f001";
const B = "00000000-0000-4000-8000-0000000a0002";
const TODAY = "2026-11-03";

const rows: FlockRow[] = [
  { id: "a", name: "Demo flock A", breed: "Isa Brown", house: "House 1", activeBirds: 1180, ageDays: 392, eggsToday: 1012, vaccinesOverdue: 0 },
  { id: B, name: "Demo flock B", breed: "Isa Brown", house: "House 2", activeBirds: 962, ageDays: 266, eggsToday: null, vaccinesOverdue: 1 },
  { id: "c", name: "Demo flock C", breed: "Lohmann Brown", house: "House 3", activeBirds: 558, ageDays: 134, eggsToday: 471, vaccinesOverdue: 0 },
];

const summary: FlockSummary = { id: B, name: "Demo flock B", breed: "Isa Brown", house: "House 2", activeBirds: 962, initialCount: 1000, ageDays: 266 };

const record: FlockRecord = {
  id: B, name: "Demo flock B", birdType: "layer", breed: "Isa Brown", house: "House 2",
  initialCount: 1000, placedOn: "2026-02-10", placedAgeDays: 0, status: "active", notes: null, version: 3,
};

const day: DaySummary = {
  flockId: B, eggs: 802, broken: 9, eggEntries: 1, eggsPrev: 861, deaths: 3,
  feedKg: 112, feedKgPrev: 118, vaccinesOverdue: 1,
  nextVaccineName: "Infectious bronchitis", nextVaccineDue: "2026-11-01",
};

const daily: DailyRow[] = [
  { day: "2026-11-03", eggs: 802, broken: 9, deaths: 3, feedKg: 112 },
  { day: "2026-11-02", eggs: 861, broken: 6, deaths: 4, feedKg: 118 },
  { day: "2026-11-01", eggs: 0, broken: 0, deaths: 0, feedKg: 0 },
  { day: "2026-10-31", eggs: 884, broken: 5, deaths: 1, feedKg: 119 },
  { day: "2026-10-30", eggs: 893, broken: 7, deaths: 0, feedKg: 121 },
  { day: "2026-10-29", eggs: 901, broken: 4, deaths: 1, feedKg: 120 },
];

const vaccinations: VaccinationRecord[] = [
  { id: "v1", vaccineName: "Newcastle disease", administeredOn: "2026-09-14", method: "Drinking water", batchNumber: "ND-2291", notes: null },
  { id: "v2", vaccineName: "Gumboro", administeredOn: "2026-08-02", method: "Drinking water", batchNumber: "GB-1180", notes: null },
];

export function OwnerPreview() {
  const repository = useMemo<LogRepository>(() => {
    const ok = async () => {
      await new Promise((r) => setTimeout(r, 600));
      return { status: "saved" as const };
    };
    return {
      saveEggCollection: ok, saveMortality: ok, saveFeed: ok, saveVaccination: ok, saveFlock: ok, saveHealth: ok,
    };
  }, []);

  return (
    <>
      <section className="flex flex-col gap-6">
        <SectionHeading title="Flock directory" description="/flocks" />
        <FlockDirectory rows={rows} />
      </section>

      <section className="flex flex-col gap-10">
        <SectionHeading title="Flock page" description="/flocks/[id], with the edit form below" />
        <FlockDetail flock={summary} placedOn={record.placedOn} today={TODAY} day={day} daily={daily} vaccinations={vaccinations}>
          <section className="flex flex-col gap-6">
            <SectionHeading title="Edit details" description="Changing the number of birds placed changes the live bird count." />
            <EditFlockForm
              flock={record}
              otherNames={["Demo flock A", "Demo flock C"]}
              save={async () => {
                await new Promise((r) => setTimeout(r, 600));
                return { status: "saved" };
              }}
            />
          </section>
        </FlockDetail>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading title="Add a flock" description="/flocks/new" />
        <NewFlockForm farmId={FARM} existingNames={rows.map((r) => r.name)} repository={repository} />
      </section>
    </>
  );
}
