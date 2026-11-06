import { LogOut } from "lucide-react";
import { SignOutForm } from "@/components/sign-out-form";
import { BackLink } from "@/components/back-link";
import { DemoBar } from "@/components/demo-bar";
import { QuickAdd } from "@/components/quick-add";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusChip } from "@/components/ui";
import type { CurrentProfile } from "@/lib/auth/session";
import { BottomNav } from "./bottom-nav";
import { SyncIndicator } from "./sync-indicator";

/** Dark, thumb-first frame for the farm team: slim top bar, bottom tabs, one big Add button. */
export function FarmhandShell({
  profile, farmName, isDemo, children,
}: { profile: CurrentProfile; farmName?: string; isDemo?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <DemoBar role="farmhand" />
      <header className="sticky top-0 z-20 border-b border-night-700 bg-night-950/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-2xl font-medium leading-tight text-night-100">Farmledger</span>
            <span className="flex items-center gap-2 truncate text-xs text-night-300">
              {farmName}
              {isDemo ? <StatusChip tone="neutral">Demo</StatusChip> : null}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <SyncIndicator />
            <span className="mr-1 hidden text-sm text-night-300 sm:inline">{profile.fullName}</span>
            <ThemeToggle onDark />
            <SignOutForm>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded px-3 text-sm font-medium text-night-200 transition-colors duration-150 ease-ledger hover:bg-night-800 hover:text-night-100">
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </button>
            </SignOutForm>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pb-40 pt-5">
        <BackLink />
        {children}
      </main>
      <QuickAdd role={profile.role} variant="fab-all" />
      <BottomNav />
    </div>
  );
}
