import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type NoticeTone = "info" | "success" | "attention" | "danger";

const styles: Record<
  NoticeTone,
  { box: string; icon: LucideIcon; role: "status" | "alert" }
> = {
  info: {
    box: "border-ivory-400 bg-ivory-200 text-stone-800",
    icon: Info,
    role: "status",
  },
  success: {
    box: "border-forest-600/30 bg-forest-50 text-forest-900",
    icon: CheckCircle2,
    role: "status",
  },
  attention: {
    box: "border-attention-500/40 bg-attention-100 text-attention-700",
    icon: AlertTriangle,
    role: "alert",
  },
  danger: {
    box: "border-danger-600/30 bg-danger-100 text-danger-700",
    icon: XCircle,
    role: "alert",
  },
};

/** Inline feedback for a result the user must notice, such as a saved record. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: NoticeTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { box, icon: Icon, role } = styles[tone];
  return (
    <div
      role={role}
      className={cn(
        "flex animate-rise-in items-start gap-3 rounded border p-4",
        box,
        className,
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-base font-medium">{title}</p>
        {children ? <div className="text-sm">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
