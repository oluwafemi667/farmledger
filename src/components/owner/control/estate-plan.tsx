import Link from "next/link";
import { CheckCircle2, CircleDashed, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/domain/metrics";

export type TileState = "ok" | "attention" | "unlogged";

export interface PlanFlock {
  id: string;
  name: string;
  breed: string | null;
  house: string | null;
  birds: number;
  henDay: number | null;
  state: TileState;
  note?: string;
}

const stateLabel: Record<TileState, string> = {
  ok: "On track",
  attention: "Needs attention",
  unlogged: "Not logged today",
};

const stateIcon = { ok: CheckCircle2, attention: TriangleAlert, unlogged: CircleDashed };

function group(flocks: PlanFlock[]): [string, PlanFlock[]][] {
  const map = new Map<string, PlanFlock[]>();
  for (const f of flocks) {
    const k = f.house?.trim() || "Unassigned";
    map.set(k, [...(map.get(k) ?? []), f]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));
}

/**
 * A site plan: each house is a bordered block, each flock a tile inside it.
 * State is carried by an icon and a word as well as the edge colour, and the
 * tile's area follows the flock's size so a big flock reads as big.
 */
export function EstatePlan({ flocks }: { flocks: PlanFlock[] }) {
  const houses = group(flocks);
  const total = Math.max(1, ...flocks.map((f) => f.birds));
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {houses.map(([house, list]) => (
        <section key={house} aria-label={house} className="flex flex-col gap-3 border border-night-600 bg-night-950 p-4">
          <header className="flex items-baseline justify-between">
            <h3 className="font-display text-lg text-night-100">{house}</h3>
            <span className="figure text-xs text-night-300">
              {list.reduce((s, f) => s + f.birds, 0).toLocaleString("en-NG")} birds
            </span>
          </header>
          <ul className="flex flex-col gap-2">
            {list.map((f) => {
              const Icon = stateIcon[f.state];
              return (
                <li key={f.id}>
                  <Link
                    href={`/flocks/${f.id}`}
                    className={cn(
                      "group relative flex min-h-[5.5rem] flex-col justify-between border-l-4 bg-night-800 p-3 transition-colors duration-150 ease-ledger hover:bg-night-700",
                      f.state === "ok" && "border-signal-400",
                      f.state === "attention" && "border-attention-500",
                      f.state === "unlogged" && "border-night-500",
                    )}
                    style={{ minHeight: `${4.5 + (f.birds / total) * 3}rem` }}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex flex-col">
                        <span className="font-medium text-night-100 group-hover:underline underline-offset-4">{f.name}</span>
                        <span className="text-xs text-night-300">{f.breed ?? "Breed not set"}</span>
                      </span>
                      <span className="figure text-right text-xl leading-none text-wheat-300">
                        {f.henDay === null ? <span className="font-sans text-xs text-night-300">No eggs yet</span> : <>{formatPercent(f.henDay)}<span className="text-sm">%</span></>}
                      </span>
                    </span>
                    <span className="mt-3 flex items-center justify-between gap-2 text-xs text-night-200">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className={cn("h-3.5 w-3.5", f.state === "attention" && "text-attention-500")} aria-hidden />
                        {f.note ?? stateLabel[f.state]}
                      </span>
                      <span className="figure">{f.birds.toLocaleString("en-NG")}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
