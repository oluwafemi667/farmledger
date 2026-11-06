import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { StatusChip } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import type { CurrentProfile } from "@/lib/auth/session";

/** Top bar shared by both interfaces until each gets its own navigation. */
export function AppHeader({
  profile,
  farmName,
  isDemo,
}: {
  profile: CurrentProfile;
  farmName?: string;
  isDemo?: boolean;
}) {
  return (
    <header className="border-b-2 border-forest-800 bg-canvas">
      <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex min-w-0 flex-col">
          <span className="font-display text-xl font-medium leading-tight">
            Farmledger
          </span>
          {farmName ? (
            <span className="truncate text-xs text-stone-600">{farmName}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {isDemo ? <StatusChip tone="neutral">Demo data</StatusChip> : null}
          <span className="hidden text-sm text-stone-700 sm:inline">
            {profile.fullName}
            <span className="text-stone-600">
              {" "}
              ({profile.role === "owner" ? "Owner" : "Farmhand"})
            </span>
          </span>
          <ThemeToggle />
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded px-3 text-sm font-medium text-forest-800 transition-colors duration-150 ease-ledger hover:bg-ivory-200"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
