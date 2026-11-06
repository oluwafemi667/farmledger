import { getCurrentProfile } from "@/lib/auth/session";
import { toCsv } from "@/lib/domain/csv";
import { reportName } from "@/lib/domain/briefing";
import { getFarmDaily, getFeedPosition, getInvoices, getMoneyDaily, getScorecard, getToday } from "@/lib/farm";

export const dynamic = "force-dynamic";

const RANGES = new Set([30, 90, 180]);

/** Owner-only CSV downloads. The database still filters every row by farm. */
export async function GET(req: Request, { params }: { params: { kind: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Sign in first.", { status: 401 });
  if (profile.role !== "owner") return new Response("Owners only.", { status: 403 });

  const asked = Number(new URL(req.url).searchParams.get("days") ?? 30);
  const days = RANGES.has(asked) ? asked : 30;
  const today = await getToday();
  let body: string;

  switch (params.kind) {
    case "production": {
      const rows = await getFarmDaily(days, today);
      body = toCsv(["Date", "Live birds", "Eggs", "Broken", "Deaths", "Feed kg"], rows.map((r) => [r.day, r.birds, r.eggs, r.broken, r.deaths, r.feedKg]));
      break;
    }
    case "flocks": {
      const rows = await getScorecard(days, today);
      body = toCsv(["Flock", "Breed", "House", "Live birds", "Eggs", "Broken", "Days logged", "Deaths", "Feed kg", "Feed kg per dozen eggs"], rows.map((r) => [r.name, r.breed, r.house, r.birds, r.eggs, r.broken, r.eggDays, r.deaths, r.feedKg, r.eggs > 0 && r.feedKg > 0 ? Number((r.feedKg / (r.eggs / 12)).toFixed(2)) : null]));
      break;
    }
    case "money": {
      const rows = await getMoneyDaily(days, today);
      body = toCsv(["Date", "Cash sales NGN", "Invoiced NGN", "Collected NGN", "Expenses NGN"], rows.map((r) => [r.day, r.salesNgn, r.invoicedNgn, r.collectedNgn, r.expensesNgn]));
      break;
    }
    case "invoices": {
      const rows = await getInvoices(1000);
      body = toCsv(["Number", "Customer", "Issued", "Due", "Status", "Total NGN", "Paid NGN", "Balance NGN"], rows.map((r) => [r.number, r.customerName, r.issuedOn, r.dueOn, r.status, r.totalNgn, r.paidNgn, r.balanceNgn]));
      break;
    }
    case "feed": {
      const rows = await getFeedPosition(today);
      body = toCsv(["Feed type", "Purchased kg", "Used kg", "On hand kg", "Daily use kg", "Days left"], rows.map((r) => [r.feedType, r.purchasedKg, r.usedKg, r.onHandKg, r.dailyUseKg, r.daysLeft]));
      break;
    }
    default:
      return new Response("Unknown report.", { status: 404 });
  }

  return new Response("﻿" + body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${reportName(params.kind, today, days)}"`,
      "cache-control": "no-store",
    },
  });
}
