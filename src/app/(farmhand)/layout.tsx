import { FarmhandShell } from "@/components/farmhand/farmhand-shell";
import { getFarm } from "@/lib/farm";
import { requireProfile } from "@/lib/auth/session";

// Per-user pages: never prerender.
export const dynamic = "force-dynamic";

// Farmhand area. Contains no finance routes, and the database would refuse the
// data anyway. Owners may also open it to see what their team sees.
export default async function FarmhandLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const farm = await getFarm();
  return (
    <FarmhandShell profile={profile} farmName={farm?.name} isDemo={farm?.isDemo}>
      {children}
    </FarmhandShell>
  );
}
