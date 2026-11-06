"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, Notice, Select } from "@/components/ui";
import type { ActionResult } from "@/lib/domain/commerce";
import type { ParseResult } from "@/lib/domain/schemas";
import { cn } from "@/lib/cn";

export interface FieldSpec {
  name: string;
  label: string;
  kind: "text" | "number" | "money" | "date" | "select";
  options?: { value: string; label: string }[];
  hint?: string;
  optional?: boolean;
  /** Take the whole row on wide screens. */
  wide?: boolean;
  list?: string[];
}

/** "" becomes undefined so an empty optional field passes and a required one says so. */
export const num = (s: string | undefined) => {
  const t = (s ?? "").trim().replace(/,/g, "");
  return t === "" ? undefined : Number(t);
};
export const str = (s: string | undefined) => {
  const t = (s ?? "").trim();
  return t === "" ? undefined : t;
};

/**
 * One form for every simple owner record. It validates in the browser for
 * instant feedback, sends the typed result to a server action that validates
 * again, keeps what was typed if the save fails, and clears itself on success.
 */
export function RecordForm<T>({
  fields,
  initial,
  parse,
  save,
  submitLabel,
  savedTitle,
  className,
}: {
  fields: FieldSpec[];
  initial: Record<string, string>;
  parse: (values: Record<string, string>) => ParseResult<T>;
  save: (data: T) => Promise<ActionResult>;
  submitLabel: string;
  savedTitle: string;
  className?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<{ kind: "saved" } | { kind: "failed"; message: string } | null>(null);
  const [pending, start] = useTransition();

  let errors: Record<string, string> = { ...serverErrors };
  if (attempted) {
    const live = parse(values);
    if (!live.ok) errors = { ...errors, ...live.errors };
  }
  const known = new Set(fields.map((f) => f.name));
  const formError = errors.form ?? Object.entries(errors).find(([k]) => !known.has(k))?.[1];

  function submit() {
    if (pending) return;
    setAttempted(true);
    setOutcome(null);
    const parsed = parse(values);
    if (!parsed.ok) return;
    setServerErrors({});
    start(async () => {
      try {
        const r = await save(parsed.data);
        if (r.status === "saved") {
          setOutcome({ kind: "saved" });
          setValues(initial);
          setAttempted(false);
          router.refresh();
        } else if (r.status === "invalid") setServerErrors(r.errors);
        else setOutcome({ kind: "failed", message: r.message });
      } catch {
        setOutcome({ kind: "failed", message: "Could not reach the server. What you typed is still here." });
      }
    });
  }

  return (
    <form
      noValidate
      className={cn("flex max-w-3xl flex-col gap-6", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        {fields.map((f) => {
          const common = {
            label: f.label,
            hint: f.hint,
            optional: f.optional,
            error: errors[f.name],
            disabled: pending,
            value: values[f.name] ?? "",
          };
          const set = (v: string) => {
            setValues((x) => ({ ...x, [f.name]: v }));
            setOutcome((o) => (o?.kind === "saved" ? null : o));
          };
          return (
            <div key={f.name} className={f.wide ? "md:col-span-2" : undefined}>
              {f.kind === "select" ? (
                <Select {...common} onChange={(e) => set(e.target.value)}>
                  {f.optional ? <option value="">Not specified</option> : null}
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              ) : (
                <>
                  <Input
                    {...common}
                    type={f.kind === "date" ? "date" : "text"}
                    inputMode={f.kind === "money" ? "decimal" : f.kind === "number" ? "numeric" : undefined}
                    autoComplete="off"
                    list={f.list ? `${f.name}-list` : undefined}
                    onChange={(e) => set(e.target.value)}
                  />
                  {f.list ? (
                    <datalist id={`${f.name}-list`}>
                      {f.list.map((o) => <option key={o} value={o} />)}
                    </datalist>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>

      {formError ? <Notice tone="danger" title="Could not save">{formError}</Notice> : null}
      {outcome?.kind === "saved" ? <Notice tone="success" title={savedTitle} /> : null}
      {outcome?.kind === "failed" ? <Notice tone="danger" title="Not saved">{outcome.message}</Notice> : null}

      <div>
        <Button type="submit" loading={pending}>{pending ? "Saving" : submitLabel}</Button>
      </div>
    </form>
  );
}
