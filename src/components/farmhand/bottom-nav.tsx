"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, History, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/today", label: "Today", icon: ClipboardList },
  { href: "/log", label: "Log", icon: Plus },
  { href: "/history", label: "History", icon: History },
];

/** Fixed bottom tabs. The active tab has a green bar and heavier text as well as colour. */
export function BottomNav({ hrefPrefix = "" }: { hrefPrefix?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Farmhand" className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-night-700 bg-night-950 print:hidden">
      <ul className="mx-auto flex max-w-2xl">
        {tabs.map(({ href, label, icon: Icon }) => {
          const full = `${hrefPrefix}${href}`;
          const active = pathname === full || pathname.startsWith(`${full}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={full}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-touch-lg flex-col items-center justify-center gap-1 text-sm transition-colors duration-150 ease-ledger",
                  active ? "font-semibold text-night-100" : "text-night-300 hover:bg-night-800",
                )}
              >
                {active ? <span aria-hidden className="absolute inset-x-8 top-0 h-0.5 bg-signal-400" /> : null}
                <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
