import Link from "next/link";
import { ChevronRight, Egg, HeartCrack, Stethoscope, Syringe, Wheat, type LucideIcon } from "lucide-react";

const items: { href: string; icon: LucideIcon; title: string; description: string }[] = [
  { href: "/log/eggs", icon: Egg, title: "Eggs", description: "Eggs collected and broken" },
  { href: "/log/feed", icon: Wheat, title: "Feed", description: "Feed given, in bags or kg" },
  { href: "/log/mortality", icon: HeartCrack, title: "Deaths", description: "Birds that died or were culled" },
  { href: "/log/vaccinations", icon: Syringe, title: "Vaccination", description: "A vaccine you have given" },
  { href: "/log/health", icon: Stethoscope, title: "Sick birds", description: "Birds that look unwell" },
];

/** Five big rows: pick what you are recording. */
export function LogMenu({ hrefPrefix = "" }: { hrefPrefix?: string }) {
  return (
    <ul className="overflow-hidden rounded-2xl border border-night-700 bg-night-900">
      {items.map(({ href, icon: Icon, title, description }) => (
        <li key={href} className="first:[&>a]:border-t-0">
          <Link
            href={`${hrefPrefix}${href}`}
            className="group flex min-h-touch-lg items-center gap-4 border-t border-night-700 px-4 py-4 transition-colors duration-150 ease-ledger hover:bg-night-800 group-first:border-0"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-night-600 bg-night-800 text-signal-400">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-lg font-medium text-night-100">{title}</span>
              <span className="text-sm text-night-300">{description}</span>
            </span>
            <ChevronRight
              className="h-5 w-5 text-night-500 transition-transform duration-150 ease-ledger group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
