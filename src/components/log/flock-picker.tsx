"use client";

import { Select } from "@/components/ui";
import type { FlockOption } from "./types";

/**
 * One flock needs no choice, so it is shown as a plain line. With several, a
 * large select that starts on the flock the farmhand came from (or empty).
 */
export function FlockPicker({
  flocks,
  value,
  onChange,
  error,
}: {
  flocks: FlockOption[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  if (flocks.length === 1) {
    return (
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Flock</p>
        <p className="text-lg font-medium">{flocks[0].name}</p>
      </div>
    );
  }
  return (
    <Select
      label="Flock"
      fieldSize="lg"
      value={value}
      error={error}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Choose a flock</option>
      {flocks.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </Select>
  );
}

/** The flock to start on: the one linked from Today, the only one, or none. */
export function initialFlockId(flocks: FlockOption[], requested?: string): string {
  if (requested && flocks.some((f) => f.id === requested)) return requested;
  return flocks.length === 1 ? flocks[0].id : "";
}
