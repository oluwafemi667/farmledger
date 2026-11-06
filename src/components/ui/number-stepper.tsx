"use client";

import { useEffect, useId, useState } from "react";
import { Minus, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NumberStepperProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Allow up to two decimal places, e.g. half a bag of feed. */
  decimal?: boolean;
  unit?: string;
  /** Previous reading shown beside the label for comparison. */
  previous?: { label: string; value: number };
  /** One-tap additions, e.g. [1, 10, 30] for eggs (30 = one crate). */
  quickAdds?: number[];
  error?: string;
  hint?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The farmhand's primary input: a large numeric field with +/- buttons and
 * one-tap additions. All controls are at least 56px.
 */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 100000,
  step = 1,
  decimal = false,
  unit,
  previous,
  quickAdds = [],
  error,
  hint,
}: NumberStepperProps) {
  const id = useId();
  const current = value ?? 0;
  const clamp = (n: number) => Math.min(max, Math.max(min, round2(n)));

  // The field keeps its own text so a half-typed "12." is not rewritten.
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => {
    const parsed = text === "" || text === "." ? null : parseFloat(text);
    if (parsed !== value) setText(value === null ? "" : String(value));
  }, [value, text]);

  const buttonClass = cn(
    "flex min-h-touch-lg min-w-touch-lg items-center justify-center rounded border border-ivory-400 bg-ivory-50 text-forest-800",
    "transition-[background-color,transform] duration-150 ease-ledger hover:bg-ivory-200 active:translate-y-px active:bg-ivory-300",
    "disabled:cursor-not-allowed disabled:text-stone-400 disabled:active:translate-y-0",
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-base font-medium text-ink">
          {label}
        </label>
        {previous ? (
          <span className="text-sm text-stone-600">
            {previous.label}{" "}
            <span className="figure font-medium text-ink">
              {previous.value.toLocaleString("en-NG")}
            </span>
          </span>
        ) : null}
      </div>

      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className={buttonClass}
          disabled={current <= min}
          onClick={() => onChange(clamp(current - step))}
        >
          <Minus className="h-6 w-6" aria-hidden />
        </button>

        <div
          className={cn(
            "flex min-h-touch-lg flex-1 items-baseline justify-center gap-2 rounded border bg-ivory-50 px-3",
            "transition-colors duration-150 ease-ledger focus-within:border-forest-800",
            error ? "border-danger-600" : "border-ivory-400",
          )}
        >
          <input
            id={id}
            inputMode={decimal ? "decimal" : "numeric"}
            autoComplete="off"
            value={text}
            placeholder="0"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            onChange={(e) => {
              let next = e.target.value.replace(decimal ? /[^0-9.]/g : /\D/g, "");
              if (decimal) {
                const [whole, ...rest] = next.split(".");
                next = rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
              }
              setText(next);
              onChange(next === "" || next === "." ? null : clamp(parseFloat(next)));
            }}
            onFocus={(e) => e.currentTarget.select()}
            className="figure w-full min-w-0 self-center bg-transparent text-center text-4xl font-medium text-ink outline-none placeholder:text-ivory-400"
          />
          {unit ? (
            <span className="self-center text-sm text-stone-600">{unit}</span>
          ) : null}
        </div>

        <button
          type="button"
          aria-label={`Increase ${label}`}
          className={buttonClass}
          disabled={current >= max}
          onClick={() => onChange(clamp(current + step))}
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {quickAdds.length > 0 ? (
        <div className="flex gap-2">
          {quickAdds.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(clamp(current + n))}
              className="figure min-h-touch flex-1 rounded border border-ivory-400 bg-ivory-50 text-base font-medium text-forest-800 transition-[background-color,transform] duration-150 ease-ledger hover:bg-ivory-200 active:translate-y-px active:bg-ivory-300"
            >
              +{n}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-danger-600"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-stone-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
