import { OpenOnHash } from "@/components/open-on-hash";
import type { ReactNode } from "react";
import { DataTable, LedgerStat, PageHeader, SectionHeading, StatusChip, type Column } from "@/components/ui";
import { gradeLabel } from "@/lib/domain/commerce";
import { formatShortDate } from "@/lib/domain/dates";
import { formatNgn } from "@/lib/domain/overview";
import { formatCrates, formatKg } from "@/lib/domain/units";
import type { EggStockRow, FeedPositionRow, FeedPurchaseRow } from "@/lib/farm";

const dash = <span className="text-stone-500">-</span>;

function DaysLeft({ days }: { days: number | null }) {
  if (days === null) return <span className="text-sm text-stone-600">No recent use</span>;
  const tone = days < 7 ? "attention" : "neutral";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="figure">{days.toFixed(1)}</span>
      <StatusChip tone={tone}>{days < 7 ? "Order now" : days < 14 ? "Order soon" : "Comfortable"}</StatusChip>
    </span>
  );
}

const feedCols: Column<FeedPositionRow>[] = [
  { key: "t", header: "Feed", render: (r) => <span className="font-medium">{r.feedType}</span> },
  { key: "h", header: "On hand", numeric: true, render: (r) => formatKg(r.onHandKg) },
  { key: "d", header: "Daily use", numeric: true, hideOnMobile: true, render: (r) => (r.dailyUseKg > 0 ? formatKg(r.dailyUseKg) : dash) },
  { key: "l", header: "Days left", numeric: true, render: (r) => <DaysLeft days={r.daysLeft} /> },
  { key: "p", header: "Bought", numeric: true, hideOnMobile: true, render: (r) => formatKg(r.purchasedKg) },
  { key: "u", header: "Used", numeric: true, hideOnMobile: true, render: (r) => formatKg(r.usedKg) },
];

const eggCols: Column<EggStockRow>[] = [
  { key: "g", header: "Size", render: (r) => <span className="font-medium">{gradeLabel[r.grade] ?? r.grade}</span> },
  { key: "c", header: "Collected", numeric: true, hideOnMobile: true, render: (r) => r.collected.toLocaleString("en-NG") },
  { key: "s", header: "Sold", numeric: true, hideOnMobile: true, render: (r) => r.sold.toLocaleString("en-NG") },
  { key: "a", header: "Adjusted", numeric: true, hideOnMobile: true, render: (r) => (r.adjusted === 0 ? dash : r.adjusted.toLocaleString("en-NG")) },
  { key: "o", header: "On hand", numeric: true, render: (r) => r.onHand.toLocaleString("en-NG") },
  { key: "k", header: "In crates", numeric: true, render: (r) => formatCrates(Math.max(0, r.onHand)) },
];

const purchaseCols: Column<FeedPurchaseRow>[] = [
  { key: "d", header: "Date", className: "whitespace-nowrap", render: (r) => formatShortDate(r.purchasedOn) },
  { key: "t", header: "Feed", render: (r) => r.feedType },
  { key: "s", header: "Supplier", hideOnMobile: true, render: (r) => r.supplier ?? dash },
  { key: "q", header: "Quantity", numeric: true, render: (r) => formatKg(r.quantityKg) },
  { key: "c", header: "Paid", numeric: true, render: (r) => formatNgn(r.costNgn) },
  { key: "k", header: "Per kg", numeric: true, hideOnMobile: true, render: (r) => `N ${(r.costNgn / r.quantityKg).toFixed(0)}` },
];

export function StockView({
  feed, eggs, purchases, feedForm, eggForm,
}: {
  feed: FeedPositionRow[]; eggs: EggStockRow[]; purchases: FeedPurchaseRow[]; feedForm: ReactNode; eggForm: ReactNode;
}) {
  const totalFeed = feed.reduce((s, f) => s + f.onHandKg, 0);
  const lowest = feed.filter((f) => f.daysLeft !== null).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];
  const onHandEggs = eggs.reduce((s, e) => s + Math.max(0, e.onHand), 0);
  const negative = eggs.some((e) => e.onHand < 0);

  return (
    <>
      <OpenOnHash />
      <PageHeader eyebrow="Stock" title="Feed and eggs in hand" description="What you hold right now, worked out from what was bought, used, collected and sold." />

      <section className="flex flex-col gap-6">
        <SectionHeading title="Feed" description="On hand is purchases minus what the farmhands logged. Days left uses the last seven full days of use." />
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
          <LedgerStat label="Feed on hand" value={Math.round(totalFeed).toLocaleString("en-NG")} unit="kg" note={`${(totalFeed / 25).toFixed(0)} bags of 25 kg`} />
          <LedgerStat
            label="Soonest to run out"
            value={lowest?.daysLeft == null ? "-" : lowest.daysLeft.toFixed(1)}
            unit={lowest?.daysLeft == null ? undefined : "days"}
            note={lowest?.daysLeft == null ? "No recent feed use to project from" : lowest.feedType}
          />
        </div>
        <DataTable caption="Feed position" columns={feedCols} rows={feed} rowKey={(r) => r.feedType}
          empty={<p className="text-stone-700">No feed recorded yet. Record a purchase below, and farmhands log what they use.</p>} />
        <details id="new-feed" className="group scroll-mt-6 border-t border-ivory-300 pt-4" open={feed.length === 0}>
          <summary className="min-h-11 cursor-pointer list-none py-2 text-base font-medium text-forest-800 underline-offset-4 hover:underline">Record a purchase</summary>
          <div className="pt-4">{feedForm}</div>
        </details>
        {purchases.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h3 className="font-display text-xl">Recent purchases</h3>
            <DataTable caption="Recent feed purchases" columns={purchaseCols} rows={purchases} rowKey={(r) => r.id} />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading title="Eggs" description="Good eggs collected, less eggs sold, plus your adjustments. Sorting by size happens when eggs are graded at collection or sold by size." />
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
          <LedgerStat label="Eggs in hand" value={onHandEggs.toLocaleString("en-NG")} note={formatCrates(onHandEggs)} />
        </div>
        {negative ? <p className="text-sm text-attention-600">A size shows less than zero. More was sold than was recorded as collected for that size. Add an adjustment, or grade the collections.</p> : null}
        <DataTable caption="Egg stock by size" columns={eggCols} rows={eggs} rowKey={(r) => r.grade}
          empty={<p className="text-stone-700">No egg stock yet.</p>} />
        <details id="adjust-eggs" className="group scroll-mt-6 border-t border-ivory-300 pt-4">
          <summary className="min-h-11 cursor-pointer list-none py-2 text-base font-medium text-forest-800 underline-offset-4 hover:underline">Adjust egg stock</summary>
          <div className="pt-4">{eggForm}</div>
        </details>
      </section>
    </>
  );
}
