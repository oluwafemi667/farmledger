import type { Metadata } from "next";
import { Sprout } from "lucide-react";
import { FlockDayCard } from "@/components/farmhand/flock-day";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatShortDate } from "@/lib/domain/dates";
import { getDailyStatus } from "@/lib/queries";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const { today, flocks, days } = await getDailyStatus();

  // Eggs and feed are daily jobs. Deaths are only recorded when they happen.
  const total = flocks.length * 2;
  const done = flocks.reduce((n, f) => {
    const d = days[f.id];
    return n + (d && d.eggEntriesToday > 0 ? 1 : 0) + (d && d.feedEntriesToday > 0 ? 1 : 0);
  }, 0);

  return (
    <>
      <PageHeader
        eyebrow={formatShortDate(today)}
        title="Today"
        description={
          flocks.length === 0
            ? undefined
            : done === total
              ? "Everything for today is recorded."
              : `${done} of ${total} daily jobs recorded.`
        }
      />

      {flocks.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No flocks to log yet"
          description="Ask the owner to add a flock, then it will appear here."
        />
      ) : (
        flocks.map((f) => <FlockDayCard key={f.id} flock={f} day={days[f.id]} />)
      )}
    </>
  );
}
