import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Notice } from "@/components/ui";
import { getCurrentProfile, homePathFor } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const configured = isSupabaseConfigured();
  const profile = configured ? await getCurrentProfile() : null;
  if (profile) redirect(homePathFor(profile.role));

  // Signed in, but no farm linked yet: explain, do not loop.
  let signedInWithoutAccess = false;
  if (configured) {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    signedInWithoutAccess = !!user;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-10 px-4 py-12">
      <header className="flex flex-col gap-3 border-t-2 border-forest-800 pt-4">
        <p className="eyebrow">Poultry farm records</p>
        <h1 className="text-4xl font-medium">Farmledger</h1>
        <p className="text-lg text-stone-700">
          {isDemoMode() ? "Records, stock and money for a large poultry farm." : "Sign in to log the day or review the farm."}
        </p>
      </header>

      {isDemoMode() ? (
        <div className="flex flex-col gap-3">
          <p className="text-stone-700">This is a public demo with sample data. Choose a side to explore.</p>
          <a href="/demo/owner" className="inline-flex min-h-12 items-center justify-center rounded bg-signal-500 px-4 font-semibold text-night-950 hover:bg-signal-400">Explore the owner dashboard</a>
          <a href="/demo/farmhand" className="inline-flex min-h-12 items-center justify-center rounded border border-ivory-400 px-4 font-medium hover:bg-ivory-200">Try the farmhand app</a>
        </div>
      ) : !configured ? (
        <Notice tone="attention" title="Database not connected">
          Copy <span className="figure">.env.local.example</span> to{" "}
          <span className="figure">.env.local</span> and add your Supabase URL and
          anon key. The{" "}
          <Link href="/design" className="font-medium underline underline-offset-2">
            design system page
          </Link>{" "}
          works without it.
        </Notice>
      ) : signedInWithoutAccess ? (
        <div className="flex flex-col gap-4">
          <Notice tone="attention" title="Your account is not linked to a farm yet">
            Ask the farm owner to add you, then sign in again.
          </Notice>
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="lg" block>
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
