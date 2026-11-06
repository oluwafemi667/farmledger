import { Egg, HeartCrack, Syringe, Wheat, type LucideIcon } from "lucide-react";
import { formatShortDate } from "@/lib/domain/dates";
import type { ActivityItem } from "@/lib/queries";

const icons: Record<ActivityItem["kind"], LucideIcon> = {
  eggs: Egg,
  deaths: HeartCrack,
  feed: Wheat,
  vaccine: Syringe,
};

/** Recent entries, grouped under the day they were recorded for. */
export function ActivityList({ items }: { items: ActivityItem[] }) {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    groups.set(item.date, [...(groups.get(item.date) ?? []), item]);
  }
  const days = [...groups.keys()].sort().reverse();

  return (
    <div className="flex flex-col gap-8">
      {days.map((date) => (
        <section key={date} aria-label={formatShortDate(date)} className="flex flex-col gap-3">
          <h2 className="eyebrow">{formatShortDate(date)}</h2>
          <ul className="overflow-hidden rounded-2xl border border-night-700 bg-night-900">
            {groups.get(date)!.map((item) => {
              const Icon = icons[item.kind];
              return (
                <li key={`${item.kind}-${item.id}`} className="flex items-center gap-4 border-t border-night-700 px-4 py-3 first:border-t-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-night-600 bg-night-800 text-signal-400"><Icon className="h-5 w-5" aria-hidden /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-medium text-night-100">
                      <span className="figure">{item.title}</span>
                    </span>
                    <span className="truncate text-sm text-night-300">
                      {[item.flockName, item.detail].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
