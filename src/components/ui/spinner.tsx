import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <LoaderCircle
      aria-label={label}
      role="img"
      className={cn("h-4 w-4 animate-spin", className)}
      strokeWidth={2}
    />
  );
}
