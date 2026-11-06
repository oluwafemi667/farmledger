"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, Notice } from "@/components/ui";
import { RecordForm, type FieldSpec } from "@/components/owner/forms/record-form";
import { addScheduleItem, applyStandardProgramme, moveScheduleItem, removeScheduleItem, reviewHealthEvent } from "@/app/(owner)/flocks/care-actions";
import { healthReviewSchema, scheduleItemSchema } from "@/lib/domain/care";
import type { ActionResult } from "@/lib/domain/commerce";
import { todayIn } from "@/lib/domain/dates";
import type { HealthRecord } from "@/lib/domain/health";
import { parseWith } from "@/lib/domain/schemas";

type Save = (raw: unknown) => Promise<ActionResult>;

/** The vet's findings and what was given, and when eggs may be sold again. Owner only. */
export function HealthReviewForm({ event, save = reviewHealthEvent }: { event: HealthRecord; save?: Save }) {
  const fields: FieldSpec[] = [
    { name: "vetFindings", label: "What the vet found", kind: "text", optional: true, wide: true },
    { name: "treatment", label: "Treatment given", kind: "text", optional: true, wide: true, hint: "Write what the vet prescribed, as on the label." },
    { name: "eggHoldUntil", label: "Do not sell eggs until", kind: "date", optional: true, hint: "Use the withdrawal period on the medicine label or from your vet." },
    { name: "status", label: "Status", kind: "select", options: [{ value: "open", label: "Still open" }, { value: "resolved", label: "Resolved" }] },
  ];
  return (
    <RecordForm
      fields={fields}
      initial={{
        vetFindings: event.vetFindings ?? "", treatment: event.treatment ?? "", eggHoldUntil: event.eggHoldUntil ?? "",
        status: event.resolvedOn ? "resolved" : "open",
      }}
      parse={(v) => parseWith(healthReviewSchema(todayIn()), { id: event.id, vetFindings: v.vetFindings, treatment: v.treatment, eggHoldUntil: v.eggHoldUntil ?? "", resolved: v.status === "resolved" })}
      save={save}
      submitLabel="Save"
      savedTitle="Saved"
    />
  );
}

export function AddVaccineForm({ flockId, save = addScheduleItem }: { flockId: string; save?: Save }) {
  return (
    <RecordForm
      fields={[
        { name: "vaccineName", label: "Vaccine", kind: "text" },
        { name: "dueOn", label: "Due on", kind: "date" },
      ]}
      initial={{ vaccineName: "", dueOn: todayIn() }}
      parse={(v) => parseWith(scheduleItemSchema(), { flockId, vaccineName: v.vaccineName, dueOn: v.dueOn })}
      save={save}
      submitLabel="Add to schedule"
      savedTitle="Added to the schedule"
    />
  );
}

/** For a flock with no schedule: put the standard programme on it. */
export function ApplyProgrammeButton({ flockId, save = applyStandardProgramme }: { flockId: string; save?: Save }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          loading={pending}
          onClick={() => start(async () => {
            const r = await save({ flockId });
            if (r.status === "saved") router.refresh();
            else setError(r.status === "invalid" ? (r.errors.form ?? "Could not add it.") : r.message);
          })}
        >
          Add the standard programme
        </Button>
      </div>
      {error ? <Notice tone="danger" title="Not added">{error}</Notice> : null}
    </div>
  );
}

/** Change the date, or remove one scheduled dose. */
export function ScheduleRowControls({
  id, dueOn, move = moveScheduleItem, remove = removeScheduleItem,
}: { id: string; dueOn: string; move?: Save; remove?: Save }) {
  const router = useRouter();
  const [date, setDate] = useState(dueOn);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      if (r.status === "saved") { setError(null); setConfirm(false); router.refresh(); }
      else setError(r.status === "invalid" ? (r.errors.form ?? Object.values(r.errors)[0] ?? "Could not save.") : r.message);
    });
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-40"><Input label="Move to" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={pending} /></div>
      {date !== dueOn ? <Button variant="secondary" loading={pending} onClick={() => run(() => move({ id, dueOn: date }))}>Save date</Button> : null}
      {confirm ? (
        <>
          <Button variant="danger" loading={pending} onClick={() => run(() => remove({ id }))}>Remove</Button>
          <Button variant="ghost" onClick={() => setConfirm(false)}>Keep</Button>
        </>
      ) : (
        <Button variant="ghost" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden /> Remove</Button>
      )}
      {error ? <p role="alert" className="w-full text-sm text-danger-600">{error}</p> : null}
    </div>
  );
}
