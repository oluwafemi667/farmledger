import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { ActivityList } from "@/components/farmhand/activity-list";
import { EmptyState, PageHeader } from "@/components/ui";
import { getRecentActivity } from "@/lib/queries";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const items = await getRecentActivity();
  return (
    <>
      <PageHeader eyebrow="History" title="Recent entries" />
      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing recorded yet"
          description="Eggs, feed, deaths and vaccines you record will be listed here."
        />
      ) : (
        <ActivityList items={items} />
      )}
    </>
  );
}
