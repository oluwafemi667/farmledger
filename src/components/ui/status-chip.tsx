import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/types/sync";

const tones: Record<Tone, string> = {
  positive: "border-forest-600/30 bg-forest-50 text-forest-800",
  neutral: "border-ivory-400 bg-ivory-200 text-stone-700",
  attention: "border-attention-500/40 bg-attention-100 text-attention-700",
  danger: "border-danger-600/30 bg-danger-100 text-danger-700",
};

/** A small rectangular label; meaning comes from the tone and the words. */
export function StatusChip({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-sm border px-2 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
