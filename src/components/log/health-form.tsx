"use client";

import { useState } from "react";
import { Input, NumberStepper } from "@/components/ui";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/domain/dates";
import { adviceFor, HEALTH_SIGNS } from "@/lib/domain/health";
import { healthSchema, parseWith } from "@/lib/domain/schemas";
import type { LogRepository } from "@/lib/data/log-repository";
import { DateField } from "./date-field";
import { FlockPicker, initialFlockId } from "./flock-picker";
import { SavedPanel } from "./saved-panel";
import { SubmitBar } from "./submit-bar";
import type { FlockOption } from "./types";
import { useRecordSubmit } from "./use-record-submit";
import { useRepository } from "./use-repository";

/** Report birds that look unwell. Tick what you see; the app says what to do next and tells the owner. */
export function HealthForm({
  farmId, flocks, requestedFlock, repository, todayHref,
}: { farmId: string; flocks: FlockOption[]; requestedFlock?: string; repository?: LogRepository; todayHref?: string }) {
  const repo = useRepository(repository);
  const today = todayIn();
  const [flockId, setFlockId] = useState(() => initialFlockId(flocks, requestedFlock));
  const [date, setDate] = useState(today);
  const [signs, setSigns] = useState<string[]>([]);
  const [affected, setAffected] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const { status, errors, failure, queued, submit, reset } = useRecordSubmit({
    farmId,
    validate: () => parseWith(healthSchema(todayIn()), { flockId, observedOn: date, signs, birdsAffected: affected, notes }),
    save: (meta, data) => repo.saveHealth(meta, data),
  });

  const advice = signs.length > 0 ? adviceFor(signs, affected) : null;

  if (status === "saved") {
    const a = adviceFor(signs, affected);
    return (
      <SavedPanel
        queued={queued}
        title="Report saved. The owner can see it."
        detail={a.text}
        todayHref={todayHref}
        onAnother={() => { reset(); setSigns([]); setAffected(null); setNotes(""); if (flocks.length > 1) setFlockId(""); }}
      />
    );
  }

  const toggle = (id: string) => setSigns((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <form className="flex flex-col gap-7" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <FlockPicker flocks={flocks} value={flockId} onChange={setFlockId} error={errors.flockId} />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-medium">What do you see?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HEALTH_SIGNS.map((s) => {
            const on = signs.includes(s.id);
            return (
              <label
                key={s.id}
                className={cn(
                  "flex min-h-touch cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base transition-colors",
                  on ? "border-signal-500 bg-signal-500/10 text-night-100" : "border-night-600 bg-night-900 text-night-200 hover:bg-night-800",
                )}
              >
                <input type="checkbox" className="h-5 w-5 accent-[rgb(48_178_120)]" checked={on} onChange={() => toggle(s.id)} />
                {s.label}
              </label>
            );
          })}
        </div>
        {errors.signs ? <p role="alert" className="text-sm text-danger-600">{errors.signs}</p> : null}
      </fieldset>

      <NumberStepper
        label="About how many birds"
        value={affected}
        onChange={setAffected}
        min={0}
        quickAdds={[5, 10, 20]}
        hint="A rough count is fine. Leave empty if you do not know."
        error={errors.birdsAffected}
      />

      {advice ? (
        <p role="status" className={cn("rounded-xl border px-4 py-3 text-base", advice.level === "attention" ? "border-attention-500/60 bg-attention-500/10" : "border-night-600 bg-night-900")}>
          <span className="font-medium">{advice.level === "attention" ? "Act now. " : "Keep watching. "}</span>
          {advice.text}
        </p>
      ) : null}

      <DateField value={date} today={today} onChange={setDate} error={errors.observedOn} />
      <Input label="Note" optional fieldSize="lg" placeholder="Anything else you noticed" value={notes} onChange={(e) => setNotes(e.target.value)} error={errors.notes} />

      <SubmitBar status={status} failure={failure} onSubmit={() => void submit()} label="Send report" />
    </form>
  );
}
