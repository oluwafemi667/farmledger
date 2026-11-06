import type { Metadata } from "next";
import { Sprout } from "lucide-react";
import { MortalityForm } from "@/components/log/mortality-form";
import { toFlockOptions } from "@/components/log/options";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { getFlocks } from "@/lib/farm";

export const metadata: Metadata = { title: "Record deaths" };

export default async function MortalityPage({
  searchParams,
}: {
  searchParams: { flock?: string };
}) {
  const profile = await requireProfile();
  const flocks = await getFlocks();

  return (
    <>
      <PageHeader eyebrow="Log" title="Record deaths" />
      {flocks.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No flocks to log yet"
          description="Ask the owner to add a flock first."
        />
      ) : (
        <MortalityForm
          farmId={profile.farmId}
          flocks={toFlockOptions(flocks)}
          requestedFlock={searchParams.flock}
        />
      )}
    </>
  );
}
