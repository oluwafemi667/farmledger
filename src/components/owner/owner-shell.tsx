import { LogOut } from "lucide-react";
import { SignOutForm } from "@/components/sign-out-form";
import { BackLink } from "@/components/back-link";
import { DemoBar } from "@/components/demo-bar";
import { QuickAdd } from "@/components/quick-add";
import { OwnerNav } from "@/components/owner/owner-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import type { CurrentProfile } from "@/lib/auth/session";

function Brand({ farmName, isDemo }: { farmName?: string; isDemo?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="font-display text-2xl font-medium leading-tight text-night-100">Farmledger</span>
      {farmName ? (
        <span className="truncate text-xs text-night-300">
          {farmName}
          {isDemo ? " / demo data" : ""}
        </span>
      ) : null}
    </div>
  );
}

function SignOut() {
  return (
    <SignOutForm>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded px-3 text-sm font-medium text-night-200 transition-colors duration-150 ease-ledger hover:bg-night-800 hover:text-night-100"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </button>
    </SignOutForm>
  );
}

/** Dark frame for the owner interface: sidebar on desktop, slim bar on phones. */
export function OwnerShell({
  profile,
  farmName,
  isDemo,
  children,
}: {
  profile: CurrentProfile;
  farmName?: string;
  isDemo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
    <DemoBar role="owner" />
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden print:hidden h-screen flex-col overflow-y-auto overscroll-contain border-r border-night-700 bg-night-950 lg:sticky lg:top-0 lg:flex">
        <div className="border-b border-night-700 px-6 py-6">
          <Brand farmName={farmName} isDemo={isDemo} />
        </div>
        <div className="px-3 pt-5"><QuickAdd role="owner" variant="bar" /></div>
        <OwnerNav />
        <div className="flex flex-col gap-1 border-t border-night-700 px-3 py-3">
          <div className="min-w-0 px-3">
            <p className="truncate text-sm text-night-100">{profile.fullName}</p>
            <p className="text-xs text-night-300">Owner</p>
          </div>
          <div className="flex items-center justify-between">
            <SignOut />
            <ThemeToggle onDark />
          </div>
        </div>
      </aside>

      <header className="flex items-center justify-between gap-3 border-b border-night-700 bg-night-950 px-4 py-2 lg:hidden print:hidden">
        <Brand farmName={farmName} isDemo={isDemo} />
        <div className="flex items-center">
          <ThemeToggle onDark />
          <SignOut />
        </div>
      </header>
      <div className="lg:hidden print:hidden">
        <OwnerNav />
      </div>

      <QuickAdd role="owner" variant="fab" />
      <main className="flex min-w-0 flex-col gap-10 px-4 pb-28 pt-6 md:px-8 lg:px-12 lg:pb-16 lg:pt-10">
        <div className="mx-auto flex w-full max-w-[84rem] flex-col gap-10"><BackLink />{children}</div>
      </main>
    </div>
    </>
  );
}
