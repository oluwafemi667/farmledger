"use client";

import { useState } from "react";
import { Input, Notice, NumberStepper } from "@/components/ui";
import { addDays, formatShortDate, todayIn } from "@/lib/domain/dates";
import { formatPercent, henDayRate } from "@/lib/domain/metrics";
import { eggCollectionSchema, parseWith } from "@/lib/domain/schemas";
import { formatCrates } from "@/lib/domain/units";
import type { LogRepository } from "@/lib/data/log-repository";
import { DateField } from "./date-field";
import { FlockPicker, initialFlockId } from "./flock-picker";
import { SavedPanel } from "./saved-panel";
import { SubmitBar } from "./submit-bar";
import type { EggContext, FlockOption } from "./types";
import { useRecordSubmit } from "./use-record-submit";
import { useRepository } from "./use-repository";

export function EggForm({
  farmId,
  flocks,
  contexts,
  requestedFlock,
  repository,
  todayHref,
}: {
  farmId: string;
  flocks: FlockOption[];
  contexts: Record<string, EggContext>;
  requestedFlock?: string;
  repository?: LogRepository;
  todayHref?: string;
}) {
  const repo = useRepository(repository);
  const today = todayIn();

  const [flockId, setFlockId] = useState(() => initialFlockId(flocks, requestedFlock));
  const [date, setDate] = useState(today);
  const [eggs, setEggs] = useState<number | null>(null);
  const [broken, setBroken] = useState<number | null>(0);
  const [notes, setNotes] = useState("");

  const flock = flocks.find((f) => f.id === flockId);
  const ctx = flockId ? contexts[flockId] : undefined;

  const { status, errors, failure, queued, submit, reset } = useRecordSubmit({
    farmId,
    validate: () =>
      parseWith(eggCollectionSchema(todayIn()), {
        flockId,
        collectedOn: date,
        eggs,
        broken,
        notes,
      }),
    save: (meta, data) => repo.saveEggCollection(meta, data),
  });

  // Hen-day rate if this entry is added to what is already recorded for the day.
  const alreadyToday = date === today ? (ctx?.eggsToday ?? 0) : 0;
  const rate =
    eggs !== null && flock ? henDayRate(alreadyToday + eggs, flock.activeBirds) : null;

  const previous =
    ctx && ctx.previousEggs !== null && ctx.previousDate
      ? {
          label: ctx.previousDate === addDays(today, -1) ? "Yesterday" : formatShortDate(ctx.previousDate),
          value: ctx.previousEggs,
        }
      : undefined;

  if (status === "saved") {
    return (
      <SavedPanel
        queued={queued}
        title={`${(eggs ?? 0).toLocaleString("en-NG")} eggs recorded`}
        detail={[flock?.name, formatCrates(eggs ?? 0), rate !== null ? `${formatPercent(rate)}% hen-day` : null]
          .filter(Boolean)
          .join(", ")}
        todayHref={todayHref}
        onAnother={() => {
          reset();
          setEggs(null);
          setBroken(0);
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
      <FlockPicker flocks={flocks} value={flockId} onChange={setFlockId} error={errors.flockId} />

      <NumberStepper
        label="Eggs collected"
        value={eggs}
        onChange={setEggs}
        previous={previous}
        quickAdds={[1, 10, 30]}
        hint={
          alreadyToday > 0
            ? `${alreadyToday.toLocaleString("en-NG")} already recorded today. This adds to it.`
            : "30 eggs is one crate."
        }
        error={errors.eggs}
      />

      {eggs !== null && eggs > 0 ? (
        <div className="rule-t rule-b flex items-baseline justify-between gap-4 py-3">
          <p className="text-sm text-stone-700">This entry</p>
          <p className="figure text-lg font-medium">
            {formatCrates(eggs)}
            {rate !== null ? <span className="ml-3 text-stone-700">{formatPercent(rate)}% hen-day</span> : null}
          </p>
        </div>
      ) : null}

      {rate !== null && rate > 1 ? (
        <Notice tone="attention" title="More eggs than live birds">
          That is above 100% for {flock?.name}. Check the number before saving.
        </Notice>
      ) : null}

      <NumberStepper
        label="Broken or cracked"
        value={broken}
        onChange={setBroken}
        error={errors.broken}
      />

      <DateField value={date} today={today} onChange={setDate} error={errors.collectedOn} />

      <Input
        label="Note"
        optional
        fieldSize="lg"
        placeholder="Anything unusual today"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        error={errors.notes}
      />

      <SubmitBar status={status} failure={failure} onSubmit={() => void submit()} label="Save collection" />
    </form>
  );
}
