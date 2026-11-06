import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronRight, Circle, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type TaskState = "done" | "todo" | "info" | "attention";

const stateLabel: Record<TaskState, string> = { done: "Done", todo: "To do", info: "", attention: "Check" };

/** One line of the daily checklist. The whole row is the tap target; state is an icon and a word, never colour alone. */
export function TaskRow({
  icon: Icon, label, status, state, href,
}: { icon: LucideIcon; label: string; status: ReactNode; state: TaskState; href: string }) {
  const StateIcon = state === "done" ? Check : state === "attention" ? TriangleAlert : Circle;
  return (
    <li>
      <Link href={href} className="group flex min-h-touch-lg items-center gap-4 border-t border-night-700 px-4 py-3 transition-colors duration-150 ease-ledger first:border-t-0 hover:bg-night-800">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
            state === "done" && "border-signal-500/40 bg-signal-500/15 text-signal-400",
            state === "attention" && "border-attention-500/50 bg-attention-500/15 text-attention-500",
            (state === "todo" || state === "info") && "border-night-600 bg-night-800 text-night-200",
          )}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-medium text-night-100">{label}</span>
          <span className="text-sm text-night-300">{status}</span>
        </span>
        {state !== "info" ? (
          <span className={cn("flex shrink-0 items-center gap-1 text-sm font-medium", state === "done" && "text-signal-400", state === "attention" && "text-attention-500", state === "todo" && "text-night-200")}>
            <StateIcon className="h-4 w-4" aria-hidden />
            {stateLabel[state]}
          </span>
        ) : null}
        <ChevronRight className="h-5 w-5 shrink-0 text-night-500 transition-transform duration-150 ease-ledger group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}
