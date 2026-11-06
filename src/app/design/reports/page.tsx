import type { Metadata } from "next";
import { OwnerShell } from "@/components/owner/owner-shell";
import { StatementView } from "@/components/owner/views/statement-view";
import { WeeklyReport } from "@/components/owner/views/weekly-report";
import { buildBriefing } from "@/lib/domain/briefing";
import { addDays } from "@/lib/domain/dates";
import { expectedEggsSeries } from "@/lib/domain/laying-curve";
import type { FarmDay, MoneyDay } from "@/lib/domain/overview";
import { buildStatement } from "@/lib/domain/statement";

export const metadata: Metadata = { title: "Reports preview" };
const TODAY = "2026-11-03";

const days: FarmDay[] = Array.from({ length: 30 }, (_, i) => ({
  day: addDays(TODAY, -(29 - i)), birds: 2700, eggs: i === 11 ? 0 : 2330 + Math.round(Math.sin(i / 3) * 30) - (i > 25 ? (i - 25) * 40 : 0),
  broken: 14, deaths: i % 9 === 0 ? 1 : 0, feedKg: 305,
}));
const money: MoneyDay[] = days.slice(-7).map((d, i) => ({ day: d.day, salesNgn: i % 2 ? 410000 : 0, invoicedNgn: i === 2 ? 1250000 : 0, collectedNgn: i === 4 ? 900000 : 0, expensesNgn: i === 1 ? 1180000 : 150000 }));
const ages = [{ birds: 1180, ageDays: 266 }, { birds: 962, ageDays: 266 }, { birds: 558, ageDays: 178 }];
const statement = buildStatement(
  [{ id: "1", number: "INV-0007", issuedOn: "2026-10-04", dueOn: "2026-10-18", totalNgn: 840000, status: "issued" }, { id: "2", number: "INV-0011", issuedOn: "2026-10-22", dueOn: "2026-11-05", totalNgn: 615000, status: "issued" }],
  [{ id: "p", invoiceId: "1", paidOn: "2026-10-15", amountNgn: 500000, method: "transfer", reference: "GTB 4471" }],
);

export default function ReportsPreview() {
  return (
    <OwnerShell profile={{ fullName: "Femi Ajayi", role: "owner", farmId: "x", userId: "u" } as never} farmName="Demo Farm" isDemo>
      <WeeklyReport
        farmName="Demo Farm" from={addDays(TODAY, -6)} to={TODAY} days={days} money={money} owed={955000}
        scorecard={[{ flockId: "a", name: "Flock A", breed: null, house: "House 1", birds: 1180, eggs: 7000, broken: 90, eggDays: 7, deaths: 2, feedKg: 1050 }, { flockId: "b", name: "Flock B", breed: null, house: "House 2", birds: 962, eggs: 5400, broken: 80, eggDays: 7, deaths: 6, feedKg: 880 }]}
        briefing={buildBriefing({ days, money, alerts: [], overdueInvoices: { count: 1, totalNgn: 340000 }, lowFeedTypes: ["Layer mash"] })}
        expected={expectedEggsSeries(days, ages, TODAY)} actions={null}
      />
      <StatementView customer={{ id: "c", name: "Mama Tola Foods", phone: "0803 555 0142", address: "Ondo Road, Akure" }} statement={statement} farmName="Demo Farm" today={TODAY} actions={null} />
    </OwnerShell>
  );
}
