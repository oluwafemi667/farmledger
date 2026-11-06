import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/types/sync";

export interface Delta {
  /** Preformatted change, e.g. "2.1 pts" or "N 42,000". */
  value: string;
  direction: "up" | "down" | "flat";
  /** Meaning, not direction: a rise in mortality is attention, not positive. */
  tone: Tone;
  /** What it is compared against, e.g. "vs last week". */
  against?: string;
}

const toneText: Record<Tone, string> = {
  positive: "text-positive",
  neutral: "text-stone-600",
  attention: "text-attention-600",
  danger: "text-danger-600",
};

const icons = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

export interface LedgerStatProps {
  label: string;
  value: string;
  unit?: string;
  delta?: Delta;
  note?: string;
  size?: "md" | "lg";
  className?: string;
}

/**
 * A figure on the page, set off by a rule rather than a card. Direction is
 * always carried by an icon and words as well as colour.
 */
export function LedgerStat({
  label,
  value,
  unit,
  delta,
  note,
  size = "md",
  className,
}: LedgerStatProps) {
  const Icon = delta ? icons[delta.direction] : null;
  return (
    <div className={cn("rule-t flex flex-col gap-1 pt-3", className)}>
      <p className="eyebrow">{label}</p>
      <p className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "figure whitespace-nowrap font-medium leading-none text-ink",
            size === "lg" ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl",
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-sm text-stone-600">{unit}</span>
        ) : null}
      </p>
      {delta && Icon ? (
        <p
          className={cn(
            "flex flex-wrap items-center gap-x-1.5 text-sm font-medium",
            toneText[delta.tone],
          )}
        >
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Icon className="h-4 w-4" aria-hidden />
            <span className="figure">{delta.value}</span>
          </span>
          {delta.against ? (
            <span className="font-normal text-stone-600">{delta.against}</span>
          ) : null}
        </p>
      ) : null}
      {note ? <p className="text-sm text-stone-600">{note}</p> : null}
    </div>
  );
}
