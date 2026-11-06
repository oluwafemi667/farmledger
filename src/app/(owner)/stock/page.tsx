import type { Metadata } from "next";
import { EggAdjustmentForm, FeedPurchaseForm } from "@/components/owner/forms/commerce-forms";
import { StockView } from "@/components/owner/views/stock-view";
import { getEggStock, getFeedPosition, getFeedPurchases, getToday } from "@/lib/farm";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage() {
  const today = await getToday();
  const [feed, eggs, purchases] = await Promise.all([getFeedPosition(today), getEggStock(), getFeedPurchases()]);
  return (
    <StockView
      feed={feed} eggs={eggs} purchases={purchases}
      feedForm={<FeedPurchaseForm feedTypes={feed.map((f) => f.feedType)} />}
      eggForm={<EggAdjustmentForm />}
    />
  );
}
