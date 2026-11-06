import { cn } from "@/lib/cn";

/** Placeholder block. Size it with className, e.g. `h-8 w-32`. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

/** A loading stand-in for a LedgerStat. */
export function StatSkeleton() {
  return (
    <div
      className="rule-t flex flex-col gap-2 pt-3"
      role="status"
      aria-label="Loading figure"
    >
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}
