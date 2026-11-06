import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NightDelta {
  value: string;
  direction: "up" | "down" | "flat";
  /** Meaning, not direction: more deaths is attention even though the number rose. */
  good: boolean | null;
  against: string;
}

const icons = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };

/** A headline figure on a dark panel. Direction is an icon plus words, never colour alone. */
export function NightStat({
  label,
  value,
  unit,
  note,
  delta,
  text,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  delta?: NightDelta;
  /** The value is words, not a figure: set it in the text face at a calmer size. */
  text?: boolean;
}) {
  const Icon = delta ? icons[delta.direction] : null;
  return (
    <div className="flex flex-col gap-2 border-t border-night-600 pt-4">
      <p className="text-xs font-medium text-night-300">{label}</p>
      <p className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "whitespace-nowrap font-medium leading-none text-night-100",
            text ? "font-display text-xl text-night-300 md:text-2xl" : "figure text-3xl font-semibold md:text-4xl",
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-base text-night-300">{unit}</span> : null}
      </p>
      {delta && Icon ? (
        <p
          className={cn(
            "flex flex-wrap items-center gap-x-1.5 text-sm",
            delta.good === false ? "text-attention-500" : delta.good ? "text-signal-400" : "text-night-300",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          <span className="figure">{delta.value}</span>
          <span className="text-night-300">{delta.against}</span>
        </p>
      ) : null}
      {note ? <p className="text-sm text-night-300">{note}</p> : null}
    </div>
  );
}
