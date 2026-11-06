"use client";

import { useState } from "react";
import { Input, NumberStepper, Select } from "@/components/ui";
import { todayIn } from "@/lib/domain/dates";
import { mortalitySchema, parseWith } from "@/lib/domain/schemas";
import type { LogRepository } from "@/lib/data/log-repository";
import { DateField } from "./date-field";
import { FlockPicker, initialFlockId } from "./flock-picker";
import { SavedPanel } from "./saved-panel";
import { Segmented } from "./segmented";
import { SubmitBar } from "./submit-bar";
import type { FlockOption } from "./types";
import { useRecordSubmit } from "./use-record-submit";
import { useRepository } from "./use-repository";

const REASONS = ["Found dead", "Sick", "Injured", "Heat stress", "Predator", "Other"];

export function MortalityForm({
  farmId,
  flocks,
  requestedFlock,
  repository,
  todayHref,
}: {
  farmId: string;
  flocks: FlockOption[];
  requestedFlock?: string;
  repository?: LogRepository;
  todayHref?: string;
}) {
  const repo = useRepository(repository);
  const today = todayIn();

  const [flockId, setFlockId] = useState(() => initialFlockId(flocks, requestedFlock));
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<"death" | "cull">("death");
  const [birds, setBirds] = useState<number | null>(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const flock = flocks.find((f) => f.id === flockId);

  const { status, errors, failure, queued, submit, reset } = useRecordSubmit({
    farmId,
    validate: () => {
      const parsed = parseWith(mortalitySchema(todayIn()), {
        flockId,
        loggedOn: date,
        kind,
        birds,
        reason,
        notes,
      });
      // A flock cannot lose more birds than it has left.
      if (parsed.ok && flock && parsed.data.birds > flock.activeBirds) {
        return {
          ok: false as const,
          errors: { birds: `${flock.name} only has ${flock.activeBirds.toLocaleString("en-NG")} live birds.` },
        };
      }
      return parsed;
    },
    save: (meta, data) => repo.saveMortality(meta, data),
  });

  if (status === "saved") {
    const left = flock ? flock.activeBirds - (birds ?? 0) : null;
    return (
      <SavedPanel
        queued={queued}
        title={`${birds} ${kind === "cull" ? "culled" : "recorded as died"}`}
        detail={
          flock && left !== null
            ? `${flock.name} now has ${left.toLocaleString("en-NG")} live birds.`
            : undefined
        }
        todayHref={todayHref}
        onAnother={() => {
          reset();
          setBirds(1);
          setReason("");
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

      <Segmented
        legend="What happened"
        name="kind"
        value={kind}
        onChange={setKind}
        options={[
          { value: "death", label: "Died" },
          { value: "cull", label: "Culled" },
        ]}
      />

      <NumberStepper
        label="Number of birds"
        value={birds}
        onChange={setBirds}
        min={0}
        quickAdds={[1, 2, 5]}
        hint={
          flock && birds
            ? `${flock.name} would have ${Math.max(flock.activeBirds - birds, 0).toLocaleString("en-NG")} live birds.`
            : undefined
        }
        error={errors.birds}
      />

      <Select
        label="Reason"
        optional
        fieldSize="lg"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={errors.reason}
      >
        <option value="">Not known</option>
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>

      <DateField value={date} today={today} onChange={setDate} error={errors.loggedOn} />

      <Input
        label="Note"
        optional
        fieldSize="lg"
        placeholder="What you saw"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        error={errors.notes}
      />

      <SubmitBar status={status} failure={failure} onSubmit={() => void submit()} label="Save" />
    </form>
  );
}
