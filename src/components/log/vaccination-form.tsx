"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/domain/dates";
import { parseWith, vaccinationSchema } from "@/lib/domain/schemas";
import type { LogRepository } from "@/lib/data/log-repository";
import { DateField } from "./date-field";
import { FlockPicker, initialFlockId } from "./flock-picker";
import { SavedPanel } from "./saved-panel";
import { SubmitBar } from "./submit-bar";
import type { DueVaccineOption, FlockOption } from "./types";
import { useRecordSubmit } from "./use-record-submit";
import { useRepository } from "./use-repository";

const METHODS = ["Drinking water", "Injection", "Eye drop", "Wing web", "Spray", "Other"];

function dueText(days: number): string {
  if (days < 0) return `Overdue by ${-days} ${days === -1 ? "day" : "days"}`;
  if (days === 0) return "Due today";
  return `Due in ${days} ${days === 1 ? "day" : "days"}`;
}

export function VaccinationForm({
  farmId,
  flocks,
  due,
  requestedFlock,
  requestedSchedule,
  repository,
  todayHref,
}: {
  farmId: string;
  flocks: FlockOption[];
  /** Scheduled vaccinations not yet given, by flock id. */
  due: Record<string, DueVaccineOption[]>;
  requestedFlock?: string;
  requestedSchedule?: string;
  repository?: LogRepository;
  todayHref?: string;
}) {
  const repo = useRepository(repository);
  const today = todayIn();

  const startFlock = initialFlockId(flocks, requestedFlock);
  const startDue = (due[startFlock] ?? []).find((d) => d.scheduleId === requestedSchedule);

  const [flockId, setFlockId] = useState(startFlock);
  const [date, setDate] = useState(today);
  const [scheduleId, setScheduleId] = useState<string | undefined>(startDue?.scheduleId);
  const [vaccineName, setVaccineName] = useState(startDue?.vaccineName ?? "");
  const [method, setMethod] = useState("");
  const [batch, setBatch] = useState("");
  const [notes, setNotes] = useState("");

  const flock = flocks.find((f) => f.id === flockId);
  const dueHere = flockId ? (due[flockId] ?? []) : [];

  const { status, errors, failure, queued, submit, reset } = useRecordSubmit({
    farmId,
    validate: () =>
      parseWith(vaccinationSchema(todayIn()), {
        flockId,
        scheduleId,
        vaccineName,
        administeredOn: date,
        method,
        batchNumber: batch,
        notes,
      }),
    save: (meta, data) => repo.saveVaccination(meta, data),
  });

  if (status === "saved") {
    return (
      <SavedPanel
        queued={queued}
        title={`${vaccineName} recorded`}
        detail={flock?.name}
        todayHref={todayHref}
        onAnother={() => {
          reset();
          setScheduleId(undefined);
          setVaccineName("");
          setMethod("");
          setBatch("");
          setNotes("");
          if (flocks.length > 1) setFlockId("");
        }}
      />
    );
  }

  return (
    <form
      className="flex flex-col gap-7"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <FlockPicker
        flocks={flocks}
        value={flockId}
        onChange={(id) => {
          setFlockId(id);
          setScheduleId(undefined);
        }}
        error={errors.flockId}
      />

      {dueHere.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-base font-medium">Scheduled for this flock</legend>
          {dueHere.map((d) => {
            const selected = scheduleId === d.scheduleId;
            return (
              <button
                key={d.scheduleId}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setScheduleId(selected ? undefined : d.scheduleId);
                  setVaccineName(selected ? "" : d.vaccineName);
                }}
                className={cn(
                  "flex min-h-touch items-center justify-between gap-3 rounded border px-4 text-left transition-colors duration-150 ease-ledger",
                  selected
                    ? "border-forest-800 bg-forest-800 text-ivory-50"
                    : "border-ivory-400 bg-ivory-50 hover:bg-ivory-200",
                )}
              >
                <span className="flex flex-col">
                  <span className="text-base font-medium">{d.vaccineName}</span>
                  <span className={cn("text-sm", selected ? "text-ivory-200" : d.daysUntil < 0 ? "text-attention-600" : "text-stone-700")}>
                    {dueText(d.daysUntil)}
                  </span>
                </span>
                {selected ? <Check className="h-5 w-5 shrink-0" aria-hidden /> : null}
              </button>
            );
          })}
        </fieldset>
      ) : null}

      <Input
        label="Vaccine"
        fieldSize="lg"
        value={vaccineName}
        autoComplete="off"
        placeholder="e.g. Newcastle disease"
        onChange={(e) => {
          setVaccineName(e.target.value);
          // Typing a different name means this is no longer the scheduled dose.
          const match = dueHere.find((d) => d.scheduleId === scheduleId);
          if (match && match.vaccineName !== e.target.value) setScheduleId(undefined);
        }}
        error={errors.vaccineName}
      />

      <Select
        label="How it was given"
        optional
        fieldSize="lg"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        error={errors.method}
      >
        <option value="">Not recorded</option>
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>

      <Input
        label="Batch number"
        optional
        fieldSize="lg"
        value={batch}
        onChange={(e) => setBatch(e.target.value)}
        error={errors.batchNumber}
      />

      <DateField
        value={date}
        today={today}
        onChange={setDate}
        error={errors.administeredOn}
        label="Date given"
      />

      <Input
        label="Note"
        optional
        fieldSize="lg"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        error={errors.notes}
      />

      <SubmitBar status={status} failure={failure} onSubmit={() => void submit()} label="Save vaccination" />
    </form>
  );
}
