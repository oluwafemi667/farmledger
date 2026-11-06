import { isDemoMode, type DemoRole } from "@/lib/demo";

/** Slim strip shown only in the public demo: says the data is sample and lets a visitor swap sides. */
export function DemoBar({ role }: { role: DemoRole }) {
  if (!isDemoMode()) return null;
  const tab = (target: DemoRole, label: string) => (
    // A plain link, not next/link: following it signs in, so it must never be prefetched.
    <a
      href={`/demo/${target}`}
      aria-current={role === target ? "page" : undefined}
      className={
        role === target
          ? "rounded bg-night-700 px-3 py-1 font-medium text-night-100"
          : "rounded px-3 py-1 text-night-200 hover:bg-night-800 hover:text-night-100"
      }
    >
      {label}
    </a>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-wheat-400/30 bg-wheat-400/10 px-4 py-1.5 text-xs text-night-100 print:hidden">
      <p>Sample data. Nothing here is real, and it resets every night.</p>
      <p className="flex items-center gap-1">
        <span className="text-night-300">Viewing as</span>
        {tab("owner", "Owner")}
        {tab("farmhand", "Farmhand")}
      </p>
    </div>
  );
}
