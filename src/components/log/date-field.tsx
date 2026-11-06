"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatShortDate } from "@/lib/domain/dates";
import { Input } from "@/components/ui";

/**
 * Defaults to today and stays out of the way. Changing it is one tap, for the
 * day someone forgets to log and enters yesterday's figures the next morning.
 */
export function DateField({
  value,
  today,
  onChange,
  error,
  label = "Date",
}: {
  value: string;
  today: string;
  onChange: (iso: string) => void;
  error?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <Input
        type="date"
        label={label}
        value={value}
        max={today}
        fieldSize="lg"
        error={error}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-base">
        <CalendarDays className="h-5 w-5 text-stone-600" aria-hidden />
        <span className="font-medium">
          {value === today ? "Today" : formatShortDate(value)}
        </span>
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded px-3 text-sm font-medium text-forest-800 transition-colors duration-150 ease-ledger hover:bg-ivory-200"
      >
        Change date
      </button>
    </div>
  );
}
