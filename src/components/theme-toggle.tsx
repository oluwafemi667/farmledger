"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Dark is the default; light stays available because a phone in direct
 * sunlight is easier to read in light. The choice is stored in a cookie so the
 * server renders the right theme on the first paint.
 */
export function ThemeToggle({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
        setTheme(next);
      }}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded px-3 text-sm font-medium transition-colors duration-150 ease-ledger",
        onDark ? "text-night-200 hover:bg-night-800 hover:text-night-100" : "text-forest-800 hover:bg-ivory-200",
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="sr-only">Switch to {next} theme</span>
    </button>
  );
}
