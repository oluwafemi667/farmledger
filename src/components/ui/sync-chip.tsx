import {
  AlertTriangle,
  Check,
  Clock,
  HardDrive,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { SyncState, Tone } from "@/types/sync";
import { StatusChip } from "./status-chip";

const config: Record<
  SyncState,
  { label: string; tone: Tone; icon: LucideIcon; spin?: boolean }
> = {
  local: { label: "Saved on this device", tone: "neutral", icon: HardDrive },
  // Routine offline state, so neutral: terracotta is reserved for real problems.
  waiting: { label: "Waiting to sync", tone: "neutral", icon: Clock },
  syncing: { label: "Syncing", tone: "neutral", icon: RefreshCw, spin: true },
  synced: { label: "Synced", tone: "positive", icon: Check },
  failed: { label: "Sync failed", tone: "danger", icon: AlertTriangle },
};

/**
 * Status of one record, or of the whole outbox when `count` is given.
 * Announced politely to screen readers whenever the state changes.
 */
export function SyncChip({
  state,
  count,
  className,
}: {
  state: SyncState;
  /** Number of records in this state, for the farm-wide indicator. */
  count?: number;
  className?: string;
}) {
  const { label, tone, icon: Icon, spin } = config[state];
  return (
    <StatusChip
      tone={tone}
      className={cn(className)}
      icon={
        <Icon
          className={cn("h-3.5 w-3.5", spin && "animate-spin")}
          aria-hidden
        />
      }
    >
      <span role="status" aria-live="polite">
        {typeof count === "number" ? `${count} ` : ""}
        {label}
      </span>
    </StatusChip>
  );
}
