import Link from "next/link";
import { CheckCircle2, Eye, TriangleAlert } from "lucide-react";
import type { Alert } from "@/lib/domain/overview";

/** The farm's open issues, most serious first. Empty means genuinely clear. */
export function AlertsRail({ alerts }: { alerts: Alert[] }) {
  return (
    <section aria-label="Alerts" className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between border-t border-night-600 pt-4">
        <h2 className="font-display text-xl text-night-100">Needs attention</h2>
        <span className="figure text-sm text-night-300">{alerts.length}</span>
      </header>
      {alerts.length === 0 ? (
        <p className="flex items-start gap-3 text-sm text-night-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-signal-400" aria-hidden />
          Nothing needs attention. Every flock with records is within its normal range.
        </p>
      ) : (
        <ul className="flex flex-col">
          {alerts.map((a) => {
            const Icon = a.level === "attention" ? TriangleAlert : Eye;
            const body = (
              <>
                <Icon
                  className={a.level === "attention" ? "mt-0.5 h-5 w-5 shrink-0 text-attention-500" : "mt-0.5 h-5 w-5 shrink-0 text-night-300"}
                  aria-hidden
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-night-100">
                    {a.title}
                    <span className="sr-only">{a.level === "attention" ? " (needs attention)" : " (to watch)"}</span>
                  </span>
                  <span className="text-sm text-night-300">{a.detail}</span>
                </span>
              </>
            );
            return (
              <li key={a.id} className="border-b border-night-700 last:border-0">
                {a.href ? (
                  <Link href={a.href} className="flex gap-3 py-3 transition-colors duration-150 ease-ledger hover:bg-night-800">
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-3 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
