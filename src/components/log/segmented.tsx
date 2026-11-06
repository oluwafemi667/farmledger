"use client";

import { cn } from "@/lib/cn";

/** A large radio group for a small closed choice, such as died or culled. */
export function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-base font-medium text-ink">{legend}</legend>
      <div className="flex gap-2">
        {options.map((o) => (
          <label key={o.value} className="relative flex-1">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-touch cursor-pointer items-center justify-center rounded border text-base font-medium",
                "transition-colors duration-150 ease-ledger",
                "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest-800",
                value === o.value
                  ? "border-forest-800 bg-forest-800 text-ivory-50"
                  : "border-ivory-400 bg-ivory-50 text-ink hover:bg-ivory-200",
              )}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
