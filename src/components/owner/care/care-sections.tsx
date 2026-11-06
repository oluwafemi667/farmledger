import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { EmptyState, Notice, SectionHeading, StatusChip } from "@/components/ui";
import { formatShortDate } from "@/lib/domain/dates";
import { adviceFor, isOpen, signLabel, type HealthRecord } from "@/lib/domain/health";
import { dueLabel } from "@/lib/domain/vaccine";
import type { ProgrammeItem, ScheduleItem } from "@/lib/farm";
import { AddVaccineForm, ApplyProgrammeButton, HealthReviewForm, ScheduleRowControls } from "./care-forms";

/** What was seen in this flock, what the vet said, and any egg hold. */
export function HealthSection({
  flockId, events, holdUntil, review = (e: HealthRecord) => <HealthReviewForm event={e} />,
}: { flockId: string; events: HealthRecord[]; holdUntil: string | null; review?: (e: HealthRecord) => React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title="Health"
        description="Reports from the team, the vet's findings, and when eggs may be sold again."
      />
      {holdUntil ? (
        <Notice tone="attention" title={`Do not sell eggs from this flock until ${formatShortDate(holdUntil)}`}>
          A treatment is still within its withdrawal period. Keep these eggs out of sales.
        </Notice>
      ) : null}
      {events.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No health reports"
          description="When the team reports sick birds, the report appears here with the next step."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const open = isOpen(e);
            const advice = adviceFor(e.signs, e.birdsAffected);
            return (
              <li key={e.id} className="flex flex-col gap-3 rounded-lg border border-ivory-400 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{formatShortDate(e.observedOn)}</span>
                  <StatusChip tone={open ? "attention" : "neutral"}>{open ? "Open" : "Resolved"}</StatusChip>
                  {e.birdsAffected ? <span className="text-sm text-stone-700">About {e.birdsAffected} birds</span> : null}
                </div>
                <p className="flex flex-wrap gap-1.5">
                  {e.signs.map((s) => <StatusChip key={s}>{signLabel(s)}</StatusChip>)}
                </p>
                {e.notes ? <p className="text-stone-700">{e.notes}</p> : null}
                {open && !e.vetFindings ? <p className="text-sm text-stone-800"><span className="font-medium">Next step: </span>{advice.text}</p> : null}
                {e.vetFindings || e.treatment || e.eggHoldUntil ? (
                  <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                    {e.vetFindings ? <><dt className="text-stone-600">Vet found</dt><dd>{e.vetFindings}</dd></> : null}
                    {e.treatment ? <><dt className="text-stone-600">Treatment</dt><dd>{e.treatment}</dd></> : null}
                    {e.eggHoldUntil ? <><dt className="text-stone-600">Eggs held until</dt><dd>{formatShortDate(e.eggHoldUntil)}</dd></> : null}
                  </dl>
                ) : null}
                <details className="group">
                  <summary className="min-h-11 cursor-pointer text-sm font-medium text-forest-800 underline-offset-4 hover:underline">Record vet findings and treatment</summary>
                  <div className="pt-3" key={`${e.id}-${e.vetFindings}-${e.treatment}-${e.eggHoldUntil}-${e.resolvedOn}`}>{review(e)}</div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <p><Link href={`/log/health?flock=${flockId}`} className="text-sm font-medium text-forest-800 underline-offset-4 hover:underline">Report sick birds in this flock</Link></p>
    </section>
  );
}

const scheduleState = (i: ScheduleItem, today: string) =>
  i.doneOn
    ? { tone: "neutral" as const, text: `Given ${formatShortDate(i.doneOn)}` }
    : i.dueOn < today
      ? { tone: "attention" as const, text: dueLabel(i.dueOn, today) }
      : { tone: "neutral" as const, text: dueLabel(i.dueOn, today) };

/** The flock's vaccination schedule, with the standard programme and its sources behind it. */
export function ProgrammeSection({
  flockId, flockName, schedule, programme, today,
  rowControls = (i: ScheduleItem) => <ScheduleRowControls id={i.id} dueOn={i.dueOn} />,
  addForm = <AddVaccineForm flockId={flockId} />,
  applyButton = <ApplyProgrammeButton flockId={flockId} />,
}: {
  flockId: string; flockName: string; schedule: ScheduleItem[]; programme: ProgrammeItem[]; today: string;
  rowControls?: (i: ScheduleItem) => React.ReactNode; addForm?: React.ReactNode; applyButton?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title="Vaccination programme"
        description={`What ${flockName} is due for. Dates come from the standard layer programme and every one can be changed.`}
      />
      {schedule.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-stone-700">No vaccines are scheduled for this flock yet.</p>
          {applyButton}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-ivory-300 rounded-lg border border-ivory-400">
          {schedule.map((i) => {
            const st = scheduleState(i, today);
            return (
              <li key={i.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{i.vaccineName}</span>
                  <span className="flex items-center gap-2 text-sm text-stone-700">
                    {formatShortDate(i.dueOn)}
                    <StatusChip tone={st.tone}>{st.text}</StatusChip>
                  </span>
                </div>
                {i.notes ? <p className="text-sm text-stone-600">{i.notes}</p> : null}
                {!i.doneOn ? <details><summary className="min-h-11 cursor-pointer text-sm font-medium text-forest-800 underline-offset-4 hover:underline">Change or remove</summary><div className="pt-2">{rowControls(i)}</div></details> : null}
              </li>
            );
          })}
        </ul>
      )}
      <details>
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-forest-800 underline-offset-4 hover:underline">Add a vaccine to this schedule</summary>
        <div className="pt-3">{addForm}</div>
      </details>
      <details>
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-forest-800 underline-offset-4 hover:underline">About the standard programme and its sources</summary>
        <div className="flex flex-col gap-3 pt-3 text-sm text-stone-700">
          <p>This is a general layer programme from published veterinary references. The references say a single programme cannot suit every region, so confirm it with your vet and adjust it for local disease risk and the vaccine maker&apos;s label.</p>
          <ul className="flex flex-col gap-1">
            {programme.map((p) => (
              <li key={p.position}>
                <span className="font-medium text-stone-900">{p.vaccineName}</span>, age {p.ageLabel}, by {p.route}.
                {p.atHatchery ? " Given at the hatchery; check the supplier's certificate." : ""}
                {p.optional ? " Only if your vet advises." : ""}
                <span className="text-stone-600"> Source: {p.source}.</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
