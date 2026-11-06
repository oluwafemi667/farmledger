"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bird,
  FileBarChart,
  LayoutDashboard,
  Package,
  ReceiptText,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Planned sections are shown, labelled, and not clickable until they exist. */
  soon?: boolean;
}

const groups: { title: string; items: Item[] }[] = [
  {
    title: "Operations",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/flocks", label: "Flocks", icon: Bird },
      { href: "/stock", label: "Stock", icon: Package },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/sales", label: "Sales and money", icon: ReceiptText },
      { href: "/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    title: "Administration",
    items: [{ href: "/team", label: "Team and audit", icon: Users }],
  },
];

const built = groups.flatMap((g) => g.items).filter((i) => !i.soon);
const short: Record<string, string> = { "/sales": "Sales", "/team": "Team", "/overview": "Home" };

/**
 * Sidebar on laptops and desktops, fixed bottom tabs on phones and tablets.
 * The active section is marked by a bar and heavier text as well as colour.
 * Sections that are planned are visible but inert and labelled "Soon".
 */
export function OwnerNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav aria-label="Owner" className="hidden flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-3 py-6 lg:flex">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-xs font-medium text-night-500">{g.title}</p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map(({ href, label, icon: Icon, soon }) => {
                const active = !soon && isActive(href);
                const inner = (
                  <>
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                    <span className="flex-1">{label}</span>
                    {soon ? <span className="text-xs text-night-500">Soon</span> : null}
                  </>
                );
                return (
                  <li key={href}>
                    {soon ? (
                      <span aria-disabled="true" className="flex min-h-11 items-center gap-3 border-l-2 border-transparent px-3 text-sm text-night-500">
                        {inner}
                      </span>
                    ) : (
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm transition-colors duration-150 ease-ledger",
                          active
                            ? "border-signal-400 bg-night-800 font-semibold text-night-100"
                            : "border-transparent text-night-200 hover:bg-night-800 hover:text-night-100",
                        )}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <nav aria-label="Owner" className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-night-700 bg-night-950 lg:hidden">
        <ul className="mx-auto flex max-w-2xl">
          {built.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-touch flex-col items-center justify-center gap-1 text-xs transition-colors duration-150 ease-ledger",
                    active ? "font-semibold text-night-100" : "text-night-300 hover:bg-night-800",
                  )}
                >
                  {active ? <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 bg-signal-400" /> : null}
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  {short[href] ?? label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
