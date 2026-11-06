"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  Bird, ChevronRight, Egg, FilePlus2, HeartCrack, Package, Plus, ReceiptText, Stethoscope, Syringe, UserPlus, Wallet, Wheat, X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/auth/session";

interface Entry { href: string; icon: LucideIcon; title: string; note: string }
interface Group { title: string; entries: Entry[] }

const DAILY: Group = {
  title: "Daily records",
  entries: [
    { href: "/log/eggs", icon: Egg, title: "Eggs", note: "Collected and broken today" },
    { href: "/log/feed", icon: Wheat, title: "Feed given", note: "In bags or kg" },
    { href: "/log/mortality", icon: HeartCrack, title: "Deaths", note: "Birds that died or were culled" },
    { href: "/log/vaccinations", icon: Syringe, title: "Vaccination", note: "A vaccine you have given" },
    { href: "/log/health", icon: Stethoscope, title: "Sick birds", note: "Birds that look unwell" },
  ],
};

const OWNER_EXTRA: Group[] = [
  { title: "Flocks and stock", entries: [
    { href: "/flocks/new", icon: Bird, title: "New flock", note: "Birds placed in a house" },
    { href: "/stock#new-feed", icon: Package, title: "New feed bags", note: "Feed bought, adds to stock" },
    { href: "/stock#adjust-eggs", icon: Egg, title: "Egg stock adjustment", note: "Cracked, gifted, counted" },
  ] },
  { title: "Money", entries: [
    { href: "/sales/invoices/new", icon: FilePlus2, title: "New invoice", note: "Sell on credit to a customer" },
    { href: "/sales/ledger#new-sale", icon: ReceiptText, title: "Cash sale", note: "Paid on the spot" },
    { href: "/sales/ledger#new-expense", icon: Wallet, title: "Expense", note: "Anything the farm spent" },
    { href: "/sales/customers#new-customer", icon: UserPlus, title: "New customer", note: "Add to your customer list" },
  ] },
];

export const quickAddGroups = (role: Role): Group[] => (role === "owner" ? [DAILY, ...OWNER_EXTRA] : [DAILY]);

/**
 * One place to start any new entry. Uses a native dialog, so focus stays inside
 * it, Escape closes it, and screen readers announce it properly.
 */
export function QuickAdd({
  role, variant, hrefPrefix = "",
}: { role: Role; variant: "fab" | "fab-all" | "bar"; hrefPrefix?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center justify-center gap-2 bg-signal-500 font-semibold text-night-950 shadow-lg transition-colors duration-150 ease-ledger hover:bg-signal-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-300 print:hidden",
          variant === "bar" ? "min-h-11 w-full rounded px-4 text-sm" : cn("fixed bottom-24 right-4 z-30 h-14 rounded-full px-5", variant === "fab" && "lg:hidden"),
        )}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        Add entry
      </button>
      <dialog
        ref={ref}
        aria-label="Add a new entry"
        onClick={(e) => { if (e.target === ref.current) close(); }}
        className="m-0 mt-auto max-h-[88vh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-night-600 bg-night-900 p-0 text-night-100 backdrop:bg-black/70 sm:m-auto sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-night-700 px-5 py-4">
          <h2 className="font-display text-2xl text-night-100">What are you adding?</h2>
          <button type="button" onClick={close} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded text-night-200 hover:bg-night-800">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-6 px-5 py-5">
          {quickAddGroups(role).map((g) => (
            <section key={g.title} className="flex flex-col gap-1">
              <h3 className="pb-1 text-xs font-medium text-night-300">{g.title}</h3>
              <ul className="flex flex-col">
                {g.entries.map(({ href, icon: Icon, title, note }) => (
                  <li key={href}>
                    <Link href={`${hrefPrefix}${href}`} onClick={close} className="group flex min-h-14 items-center gap-4 rounded px-2 py-2 transition-colors duration-150 ease-ledger hover:bg-night-800">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-night-600 bg-night-800 text-signal-400"><Icon className="h-5 w-5" aria-hidden /></span>
                      <span className="flex min-w-0 flex-1 flex-col"><span className="font-medium text-night-100">{title}</span><span className="text-sm text-night-300">{note}</span></span>
                      <ChevronRight className="h-5 w-5 text-night-500" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </dialog>
    </>
  );
}
