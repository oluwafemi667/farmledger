import { Egg, Syringe, Wheat, HeartCrack } from "lucide-react";
import type { FlockDay } from "@/lib/domain/daily-status";
import { formatKg } from "@/lib/domain/units";
import { formatAge } from "@/lib/domain/dates";
import type { FlockSummary } from "@/lib/farm";
import { TaskRow } from "./task-row";

function dueText(days: number): string {
  if (days < 0) return `overdue by ${-days} ${days === -1 ? "day" : "days"}`;
  if (days === 0) return "due today";
  return `due in ${days} ${days === 1 ? "day" : "days"}`;
}

/** One flock's checklist for today. `linkBase` lets the preview route reuse it. */
export function FlockDayCard({
  flock,
  day,
  linkBase = "",
}: {
  flock: FlockSummary;
  day: FlockDay | undefined;
  linkBase?: string;
}) {
  const q = `?flock=${flock.id}`;
  const eggsDone = (day?.eggEntriesToday ?? 0) > 0;
  const feedDone = (day?.feedEntriesToday ?? 0) > 0;
  const deaths = day?.deathsToday ?? 0;

  return (
    <section aria-labelledby={`flock-${flock.id}`} className="overflow-hidden rounded-2xl border border-night-700 bg-night-900">
      <div className="flex items-baseline justify-between gap-4 border-b border-night-700 px-4 py-4">
        <div className="flex flex-col">
          <h2 id={`flock-${flock.id}`} className="font-display text-2xl font-medium text-night-100">
            {flock.name}
          </h2>
          <p className="text-sm text-night-300">
            {[flock.house, formatAge(flock.ageDays)].filter(Boolean).join(", ")}
          </p>
        </div>
        <p className="figure text-3xl text-wheat-300">
          {flock.activeBirds.toLocaleString("en-NG")}
          <span className="ml-1.5 text-sm text-night-300">birds</span>
        </p>
      </div>

      <ul className="flex flex-col">
        <TaskRow
          icon={Egg}
          label="Eggs"
          state={eggsDone ? "done" : "todo"}
          href={`${linkBase}/log/eggs${q}`}
          status={
            eggsDone ? (
              <>
                <span className="figure font-medium text-night-100">
                  {day!.eggsToday.toLocaleString("en-NG")}
                </span>{" "}
                today
                {day!.previousEggs !== null ? (
                  <>
                    , yesterday{" "}
                    <span className="figure">{day!.previousEggs.toLocaleString("en-NG")}</span>
                  </>
                ) : null}
              </>
            ) : (
              "Not recorded yet"
            )
          }
        />
        <TaskRow
          icon={Wheat}
          label="Feed"
          state={feedDone ? "done" : "todo"}
          href={`${linkBase}/log/feed${q}`}
          status={feedDone ? formatKg(day!.feedKgToday) : "Not recorded yet"}
        />
        <TaskRow
          icon={HeartCrack}
          label="Deaths"
          state={deaths > 0 ? "attention" : "info"}
          href={`${linkBase}/log/mortality${q}`}
          status={
            deaths > 0
              ? `${deaths} recorded today`
              : "None recorded today. Tap only if a bird died."
          }
        />
        {(day?.dueVaccines ?? []).map((v) => (
          <TaskRow
            key={v.scheduleId}
            icon={Syringe}
            label={v.vaccineName}
            state={v.daysUntil < 0 ? "attention" : "todo"}
            href={`${linkBase}/log/vaccinations${q}&schedule=${v.scheduleId}`}
            status={`Vaccination ${dueText(v.daysUntil)}`}
          />
        ))}
      </ul>
    </section>
  );
}
