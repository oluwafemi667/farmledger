"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, LinkButton, Notice } from "@/components/ui";
import { SubmitBar } from "@/components/log/submit-bar";
import { useRecordSubmit } from "@/components/log/use-record-submit";
import { useRepository } from "@/components/log/use-repository";
import type { LogRepository } from "@/lib/data/log-repository";
import { todayIn } from "@/lib/domain/dates";
import {
  flockSchema,
  parseWith,
  type FlockInput,
  type ParseResult,
} from "@/lib/domain/schemas";
import type { FlockRecord } from "@/lib/farm";
import {
  updateFlockAction,
  type UpdateFlockInput,
  type UpdateFlockResult,
} from "@/app/(owner)/flocks/actions";

interface Values {
  name: string;
  breed: string;
  house: string;
  initialCount: string;
  placedOn: string;
  placedAgeDays: string;
}

const BREEDS = ["Isa Brown", "Lohmann Brown", "Hy-Line Brown", "Shaver Brown"];

const blank = (): Values => ({
  name: "",
  breed: "",
  house: "",
  initialCount: "",
  placedOn: todayIn(),
  placedAgeDays: "0",
});

const fromRecord = (f: FlockRecord): Values => ({
  name: f.name,
  breed: f.breed ?? "",
  house: f.house ?? "",
  initialCount: String(f.initialCount),
  placedOn: f.placedOn,
  placedAgeDays: String(f.placedAgeDays),
});

const toNumber = (s: string) => (s.trim() === "" ? null : Number(s));

/** Validate, and also refuse a name another flock already uses. */
function parseValues(
  v: Values,
  today: string,
  otherNames: string[],
): ParseResult<FlockInput> {
  const parsed = parseWith(flockSchema(today), {
    name: v.name,
    breed: v.breed,
    house: v.house,
    initialCount: toNumber(v.initialCount),
    placedOn: v.placedOn,
    placedAgeDays: toNumber(v.placedAgeDays),
  });
  const taken = otherNames.some(
    (n) => n.trim().toLowerCase() === v.name.trim().toLowerCase(),
  );
  if (taken) {
    const errors = parsed.ok ? {} : parsed.errors;
    return { ok: false, errors: { ...errors, name: "A flock with this name already exists." } };
  }
  return parsed;
}

function Fields({
  values,
  onChange,
  errors,
  disabled,
}: {
  values: Values;
  onChange: (patch: Partial<Values>) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}) {
  const digits = (s: string) => s.replace(/\D/g, "");
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Input
        label="Flock name"
        value={values.name}
        onChange={(e) => onChange({ name: e.target.value })}
        error={errors.name}
        disabled={disabled}
        autoComplete="off"
        hint="How the team will find it, for example Flock A."
      />
      <Input
        label="Breed"
        optional
        list="flock-breeds"
        value={values.breed}
        onChange={(e) => onChange({ breed: e.target.value })}
        error={errors.breed}
        disabled={disabled}
        autoComplete="off"
      />
      <datalist id="flock-breeds">
        {BREEDS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <Input
        label="House"
        optional
        value={values.house}
        onChange={(e) => onChange({ house: e.target.value })}
        error={errors.house}
        disabled={disabled}
        autoComplete="off"
      />
      <Input
        label="Birds placed"
        inputMode="numeric"
        value={values.initialCount}
        onChange={(e) => onChange({ initialCount: digits(e.target.value) })}
        error={errors.initialCount}
        disabled={disabled}
        autoComplete="off"
        hint="The starting number. Deaths are subtracted automatically."
      />
      <Input
        label="Placement date"
        type="date"
        max={todayIn()}
        value={values.placedOn}
        onChange={(e) => onChange({ placedOn: e.target.value })}
        error={errors.placedOn}
        disabled={disabled}
      />
      <Input
        label="Age when placed (days)"
        inputMode="numeric"
        value={values.placedAgeDays}
        onChange={(e) => onChange({ placedAgeDays: digits(e.target.value) })}
        error={errors.placedAgeDays}
        disabled={disabled}
        autoComplete="off"
        hint="0 for day-old chicks. Used for the expected laying curve."
      />
    </div>
  );
}

/** Owner: add a flock. Saves through the repository like every other record. */
export function NewFlockForm({
  farmId,
  existingNames,
  repository,
}: {
  farmId: string;
  existingNames: string[];
  repository?: LogRepository;
}) {
  const repo = useRepository(repository);
  const [values, setValues] = useState<Values>(blank);
  const [addedNames, setAddedNames] = useState<string[]>([]);
  const names = [...existingNames, ...addedNames];

  const { status, errors, failure, submit, reset } = useRecordSubmit({
    farmId,
    validate: () => parseValues(values, todayIn(), names),
    save: (meta, data) => repo.saveFlock(meta, data),
  });

  if (status === "saved") {
    return (
      <div className="flex max-w-xl flex-col gap-6">
        <Notice tone="success" title={`${values.name.trim()} added`}>
          The farm team can now log eggs, deaths, feed and vaccines for it.
        </Notice>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setAddedNames((n) => [...n, values.name.trim()]);
              setValues(blank());
              reset();
            }}
          >
            Add another flock
          </Button>
          <LinkButton href="/flocks" variant="secondary">
            Back to flocks
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex max-w-3xl flex-col gap-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Fields
        values={values}
        onChange={(p) => setValues((v) => ({ ...v, ...p }))}
        errors={errors}
        disabled={status === "saving"}
      />
      <div className="max-w-sm">
        <SubmitBar status={status} failure={failure} onSubmit={() => void submit()} label="Add flock" />
      </div>
    </form>
  );
}

/**
 * Owner: edit a flock. Sends the version it was loaded with; if someone else
 * has saved since, nothing is overwritten and the owner is told to reload.
 */
export function EditFlockForm({
  flock,
  otherNames,
  save = updateFlockAction,
}: {
  flock: FlockRecord;
  /** Names of the farm's other flocks, to catch duplicates before saving. */
  otherNames: string[];
  save?: (input: UpdateFlockInput) => Promise<UpdateFlockResult>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => fromRecord(flock));
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<
    { kind: "saved" } | { kind: "conflict" | "failed"; message: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  let errors: Record<string, string> = { ...serverErrors };
  if (attempted) {
    const live = parseValues(values, todayIn(), otherNames);
    if (!live.ok) errors = { ...errors, ...live.errors };
  }

  const conflict = outcome?.kind === "conflict";

  function onSubmit() {
    if (pending || conflict) return;
    setAttempted(true);
    setOutcome(null);
    const parsed = parseValues(values, todayIn(), otherNames);
    if (!parsed.ok) return;
    setServerErrors({});
    startTransition(async () => {
      try {
        const result = await save({
          id: flock.id,
          expectedVersion: flock.version,
          values: parsed.data,
        });
        if (result.status === "saved") {
          setOutcome({ kind: "saved" });
          router.refresh();
        } else if (result.status === "invalid") {
          setServerErrors(result.errors);
        } else {
          setOutcome({ kind: result.status, message: result.message });
        }
      } catch {
        setOutcome({
          kind: "failed",
          message: "Could not reach the server. Your changes are still here.",
        });
      }
    });
  }

  return (
    <form
      className="flex max-w-3xl flex-col gap-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Fields
        values={values}
        onChange={(p) => {
          setValues((v) => ({ ...v, ...p }));
          setOutcome((o) => (o?.kind === "saved" ? null : o));
        }}
        errors={errors}
        disabled={pending || conflict}
      />

      {outcome?.kind === "saved" ? (
        <Notice tone="success" title="Changes saved" />
      ) : null}
      {outcome && outcome.kind !== "saved" ? (
        <Notice
          tone={outcome.kind === "conflict" ? "attention" : "danger"}
          title={outcome.kind === "conflict" ? "This flock was changed by someone else" : "Not saved"}
          action={
            outcome.kind === "conflict" ? (
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Reload
              </Button>
            ) : undefined
          }
        >
          {outcome.message}
        </Notice>
      ) : null}

      <div>
        <Button type="submit" loading={pending} disabled={conflict}>
          {pending ? "Saving" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
