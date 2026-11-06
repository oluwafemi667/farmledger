import { Download, Printer } from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/ui";
import type { Briefing } from "@/lib/domain/briefing";

const TONE = { good: "bg-signal-400", watch: "bg-wheat-400", attention: "bg-attention-500" } as const;

const REPORTS = [
  { kind: "production", title: "Daily production", note: "Birds, eggs, broken, deaths and feed for every day." },
  { kind: "flocks", title: "Flock scorecard", note: "Each flock side by side over the period." },
  { kind: "money", title: "Money by day", note: "Cash sales, invoiced, collected and expenses." },
  { kind: "invoices", title: "Invoices", note: "Every invoice with what is paid and what is owed." },
  { kind: "feed", title: "Feed position", note: "Purchased, used and days of feed left." },
];

export function ReportsView({ briefing, dateLabel }: { briefing: Briefing; dateLabel: string }) {
  return (
    <>
      <PageHeader eyebrow="Governance" title="Reports" description="The morning briefing, and your records as spreadsheets for the accountant, the bank or a partner." />
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading title="Morning briefing" description={`${dateLabel}. Built from your own records by fixed rules, so every line matches a figure elsewhere in the app.`} />
          <button type="button" data-print className="print:hidden inline-flex min-h-11 items-center gap-2 rounded px-3 text-sm font-medium text-forest-800 hover:underline">
            <Printer className="h-4 w-4" aria-hidden /> Print
          </button>
        </div>
        <ul className="flex flex-col divide-y divide-stone-200 rounded-lg border border-stone-200">
          {briefing.lines.map((l, i) => (
            <li key={i} className="flex gap-3 p-4">
              <span aria-hidden className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${TONE[l.tone]}`} />
              <span><span className="sr-only">{l.tone === "attention" ? "Needs attention: " : l.tone === "watch" ? "Keep an eye on: " : "Good: "}</span>{l.text}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3 print:hidden">
        <SectionHeading title="Weekly report" description="One printable page for a partner, the bank or your own files. Save it as a PDF from the print dialog." />
        <div><a href="/reports/weekly" className="inline-flex min-h-11 items-center gap-2 rounded border border-ivory-400 px-4 text-sm font-medium hover:bg-ivory-200"><Printer className="h-4 w-4" aria-hidden /> Open weekly report</a></div>
      </section>
      <section className="flex flex-col gap-4 print:hidden">
        <SectionHeading title="Download as spreadsheet" description="Opens in Excel, Google Sheets or Numbers." />
        <div className="grid gap-3 md:grid-cols-2">
          {REPORTS.map((r) => (
            <div key={r.kind} className="flex flex-col gap-3 rounded-lg border border-stone-200 p-4">
              <div><p className="font-medium">{r.title}</p><p className="text-sm text-stone-600">{r.note}</p></div>
              <div className="flex flex-wrap gap-2">
                {(r.kind === "invoices" || r.kind === "feed" ? [30] : [30, 90, 180]).map((d) => (
                  <a key={d} href={`/reports/export/${r.kind}?days=${d}`} download className="inline-flex min-h-11 items-center gap-2 rounded border border-stone-300 px-3 text-sm font-medium hover:bg-stone-100">
                    <Download className="h-4 w-4" aria-hidden /> {r.kind === "invoices" || r.kind === "feed" ? "Download" : `${d} days`}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
