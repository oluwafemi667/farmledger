import type { Metadata } from "next";
import { Sprout } from "lucide-react";
import { EggForm } from "@/components/log/egg-form";
import { toEggContexts, toFlockOptions } from "@/components/log/options";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { getDailyStatus } from "@/lib/queries";

export const metadata: Metadata = { title: "Record eggs" };

export default async function EggsPage({
  searchParams,
}: {
  searchParams: { flock?: string };
}) {
  const profile = await requireProfile();
  const { flocks, days } = await getDailyStatus();

  return (
    <>
      <PageHeader eyebrow="Log" title="Record eggs" />
      {flocks.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No flocks to log yet"
          description="Ask the owner to add a flock first."
        />
      ) : (
        <EggForm
          farmId={profile.farmId}
          flocks={toFlockOptions(flocks)}
          contexts={toEggContexts(flocks, days)}
          requestedFlock={searchParams.flock}
        />
      )}
    </>
  );
}
