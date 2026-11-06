"use client";

import { useId, useState } from "react";
import { Input, NumberStepper } from "@/components/ui";
import { todayIn } from "@/lib/domain/dates";
import { feedGramsPerBird } from "@/lib/domain/metrics";
import { feedSchema, parseWith } from "@/lib/domain/schemas";
import { formatKg, toKg, type FeedUnit } from "@/lib/domain/units";
import type { LogRepository } from "@/lib/data/log-repository";
import { DateField } from "./date-field";
import { FlockPicker, initialFlockId } from "./flock-picker";
import { SavedPanel } from "./saved-panel";
import { Segmented } from "./segmented";
import { SubmitBar } from "./submit-bar";
import type { FlockOption } from "./types";
import { useRecordSubmit } from "./use-record-submit";
import { useRepository } from "./use-repository";

export function FeedForm({
  farmId,
  flocks,
  recentFeedTypes,
  requestedFlock,
  repository,
  todayHref,
}: {
  farmId: string;
  flocks: FlockOption[];
  /** Most recent first. The first one is the default. */
  recentFeedTypes: string[];
  requestedFlock?: string;
  repository?: LogRepository;
  todayHref?: string;
}) {
  const repo = useRepository(repository);
  const today = todayIn();
  const listId = useId();

  const [flockId, setFlockId] = useState(() => initialFlockId(flocks, requestedFlock));
  const [date, setDate] = useState(today);
  const [feedType, setFeedType] = useState(recentFeedTypes[0] ?? "");
  const [unit, setUnit] = useState<FeedUnit>("bag");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const flock = flocks.find((f) => f.id === flockId);

  const { status, errors, failure, queued, submit, reset } = useRecordSubmit({
    farmId,
    validate: () =>
      parseWith(feedSchema(todayIn()), {
        flockId,
        loggedOn: date,
        feedType,
        quantity,
        unit,
        notes,
      }),
    save: (meta, data) => repo.saveFeed(meta, data),
  });

  const kg = quantity !== null && quantity > 0 ? toKg(quantity, unit) : null;
  const perBird = kg !== null && flock ? feedGramsPerBird(kg, flock.activeBirds) : null;

  if (status === "saved") {
    return (
      <SavedPanel
        queued={queued}
        title={`${kg !== null ? formatKg(kg) : "Feed"} recorded`}
        detail={[flock?.name, feedType].filter(Boolean).join(", ")}
        todayHref={todayHref}
        onAnother={() => {
          reset();
          setQuantity(null);
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

      <Input
        label="Feed type"
        fieldSize="lg"
        value={feedType}
        list={listId}
        autoComplete="off"
        placeholder="e.g. Layer mash"
        onChange={(e) => setFeedType(e.target.value)}
        error={errors.feedType}
      />
      <datalist id={listId}>
        {recentFeedTypes.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <Segmented
        legend="Measured in"
        name="unit"
        value={unit}
        onChange={(u) => {
          setUnit(u);
          setQuantity(null);
        }}
        options={[
          { value: "bag", label: "Bags (25 kg)" },
          { value: "kg", label: "Kilograms" },
        ]}
      />

      <NumberStepper
        label="Quantity given"
        value={quantity}
        onChange={setQuantity}
        decimal
        step={unit === "bag" ? 0.5 : 5}
        unit={unit === "bag" ? "bags" : "kg"}
        quickAdds={unit === "bag" ? [0.5, 1, 5] : [10, 25, 50]}
        hint={
          kg !== null
            ? `${formatKg(kg)}${perBird !== null ? `, ${Math.round(perBird)} g per bird` : ""}`
            : undefined
        }
        error={errors.quantity}
      />

      <DateField value={date} today={today} onChange={setDate} error={errors.loggedOn} />

      <Input
        label="Note"
        optional
        fieldSize="lg"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        error={errors.notes}
      />

      <SubmitBar status={status} failure={failure} onSubmit={() => void submit()} label="Save feed" />
    </form>
  );
}
