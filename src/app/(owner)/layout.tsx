import { OwnerShell } from "@/components/owner/owner-shell";
import { getFarm } from "@/lib/farm";
import { requireProfile } from "@/lib/auth/session";

// Per-user pages: never prerender.
export const dynamic = "force-dynamic";

// Owner-only area. A farmhand who lands here is redirected to /today.
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile("owner");
  const farm = await getFarm();
  return (
    <OwnerShell profile={profile} farmName={farm?.name} isDemo={farm?.isDemo}>
      {children}
    </OwnerShell>
  );
}
