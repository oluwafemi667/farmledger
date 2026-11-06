import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Says what is missing, why, and what to do next. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded border border-dashed border-ivory-400 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <Icon className="h-6 w-6 text-stone-500" strokeWidth={1.5} aria-hidden />
      ) : null}
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="max-w-sm text-sm text-stone-700">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
