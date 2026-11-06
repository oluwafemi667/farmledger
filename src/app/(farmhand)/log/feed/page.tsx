import type { Metadata } from "next";
import { Sprout } from "lucide-react";
import { FeedForm } from "@/components/log/feed-form";
import { toFlockOptions } from "@/components/log/options";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { getFlocks } from "@/lib/farm";
import { getRecentFeedTypes } from "@/lib/queries";

export const metadata: Metadata = { title: "Record feed" };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: { flock?: string };
}) {
  const profile = await requireProfile();
  const [flocks, recentFeedTypes] = await Promise.all([getFlocks(), getRecentFeedTypes()]);

  return (
    <>
      <PageHeader eyebrow="Log" title="Record feed" />
      {flocks.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No flocks to log yet"
          description="Ask the owner to add a flock first."
        />
      ) : (
        <FeedForm
          farmId={profile.farmId}
          flocks={toFlockOptions(flocks)}
          recentFeedTypes={recentFeedTypes}
          requestedFlock={searchParams.flock}
        />
      )}
    </>
  );
}
