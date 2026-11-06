"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { FlockDayCard } from "@/components/farmhand/flock-day";
import { LogMenu } from "@/components/farmhand/log-menu";
import { EggForm } from "@/components/log/egg-form";
import { FeedForm } from "@/components/log/feed-form";
import { MortalityForm } from "@/components/log/mortality-form";
import { VaccinationForm } from "@/components/log/vaccination-form";
import type { DueVaccineOption, EggContext, FlockOption } from "@/components/log/types";
import type { LogRepository } from "@/lib/data/log-repository";
import { classifySaveError, type SaveResult } from "@/lib/data/errors";
import type { FlockDay } from "@/lib/domain/daily-status";
import type { FlockSummary } from "@/lib/farm";
import { SectionHeading } from "@/components/ui";

// Demonstration data only. Nothing here is read from, or written to, a database.
const FARM = "00000000-0000-4000-8000-00000000f001";
const A = "00000000-0000-4000-8000-0000000a0001";
const B = "00000000-0000-4000-8000-0000000a0002";
const C = "00000000-0000-4000-8000-0000000a0003";

const flocks: FlockSummary[] = [
  { id: A, name: "Demo flock A", breed: "Isa Brown", house: "House 1", activeBirds: 1180, initialCount: 1200, ageDays: 392 },
  { id: B, name: "Demo flock B", breed: "Isa Brown", house: "House 2", activeBirds: 962, initialCount: 1000, ageDays: 266 },
  { id: C, name: "Demo flock C", breed: "Lohmann Brown", house: "House 3", activeBirds: 558, initialCount: 560, ageDays: 134 },
];
const options: FlockOption[] = flocks.map((f) => ({ id: f.id, name: f.name, activeBirds: f.activeBirds }));

const day = (o: Partial<FlockDay> & { flockId: string }): FlockDay => ({
  eggsToday: 0,
  eggEntriesToday: 0,
  previousEggs: null,
  previousDate: null,
  feedKgToday: 0,
  feedEntriesToday: 0,
  deathsToday: 0,
  dueVaccines: [],
  ...o,
});

const days: Record<string, FlockDay> = {
  [A]: day({ flockId: A, eggsToday: 1012, eggEntriesToday: 2, previousEggs: 1031, previousDate: "2026-11-02", feedKgToday: 138, feedEntriesToday: 1 }),
  [B]: day({
    flockId: B,
    previousEggs: 802,
    previousDate: "2026-11-02",
    deathsToday: 3,
    dueVaccines: [{ scheduleId: "s2", vaccineName: "Infectious bronchitis", dueOn: "2026-11-01", daysUntil: -2 }],
  }),
  [C]: day({
    flockId: C,
    previousEggs: 508,
    previousDate: "2026-11-02",
    dueVaccines: [{ scheduleId: "s3", vaccineName: "Newcastle disease booster", dueOn: "2026-11-08", daysUntil: 5 }],
  }),
};

const eggContexts: Record<string, EggContext> = Object.fromEntries(
  flocks.map((f) => [
    f.id,
    { eggsToday: days[f.id].eggsToday, previousEggs: days[f.id].previousEggs, previousDate: days[f.id].previousDate },
  ]),
);
const due: Record<string, DueVaccineOption[]> = Object.fromEntries(
  flocks.map((f) => [
    f.id,
    days[f.id].dueVaccines.map((v) => ({ scheduleId: v.scheduleId, vaccineName: v.vaccineName, daysUntil: v.daysUntil })),
  ]),
);

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow">{title}</p>
      <div className="w-full max-w-[390px] rounded-lg border border-ivory-400 bg-canvas p-5">
        {children}
      </div>
    </div>
  );
}

export function FarmhandPreview() {
  const [offline, setOffline] = useState(false);
  const offlineRef = useRef(false);
  offlineRef.current = offline;

  // A stand-in repository: waits a moment, then saves or fails like a dropped connection.
  const repository = useMemo<LogRepository>(() => {
    const respond = async (meta: { id: string }): Promise<SaveResult> => {
      // Record each attempt's id so a browser test can prove retries reuse one id.
      const w = window as unknown as { __saveLog?: { id: string; offline: boolean }[] };
      (w.__saveLog ??= []).push({ id: meta.id, offline: offlineRef.current });
      await new Promise((r) => setTimeout(r, 700));
      return offlineRef.current
        ? classifySaveError({ message: "TypeError: Failed to fetch" })
        : { status: "saved" };
    };
    return {
      saveEggCollection: respond,
      saveMortality: respond,
      saveFeed: respond,
      saveVaccination: respond,
      saveFlock: respond,
      saveHealth: respond,
    };
  }, []);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <SectionHeading
          title="Try it"
          description="These are the real forms. Saving goes to a fake repository that never touches a database."
        />
        <label className="flex min-h-touch items-center gap-3 text-base">
          <input
            type="checkbox"
            checked={offline}
            onChange={(e) => setOffline(e.target.checked)}
            className="h-6 w-6 accent-forest-800"
          />
          Simulate no connection (saves will fail)
        </label>
      </div>

      <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
        <Frame title="Today">
          <div className="flex flex-col gap-8">
            {flocks.map((f) => (
              <FlockDayCard key={f.id} flock={f} day={days[f.id]} linkBase="/design/farmhand" />
            ))}
          </div>
        </Frame>
        <Frame title="Log menu">
          <LogMenu hrefPrefix="/design/farmhand" />
        </Frame>
        <Frame title="Record eggs">
          <EggForm farmId={FARM} flocks={options} contexts={eggContexts} requestedFlock={A} repository={repository} todayHref="/design/farmhand" />
        </Frame>
        <Frame title="Record deaths">
          <MortalityForm farmId={FARM} flocks={options} requestedFlock={B} repository={repository} todayHref="/design/farmhand" />
        </Frame>
        <Frame title="Record feed">
          <FeedForm farmId={FARM} flocks={options} recentFeedTypes={["Layer mash", "Grower mash"]} requestedFlock={C} repository={repository} todayHref="/design/farmhand" />
        </Frame>
        <Frame title="Record a vaccination">
          <VaccinationForm farmId={FARM} flocks={options} due={due} requestedFlock={B} requestedSchedule="s2" repository={repository} todayHref="/design/farmhand" />
        </Frame>
      </div>
    </div>
  );
}
