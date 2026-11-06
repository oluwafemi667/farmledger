import type { ReactNode } from "react";
import { DataTable, PageHeader, SectionHeading, StatusChip, type Column } from "@/components/ui";
import { describeAudit } from "@/lib/domain/audit";
import type { AuditEntry, StaffRow } from "@/lib/farm";

const when = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : null;

const staffCols: Column<StaffRow>[] = [
  { key: "n", header: "Person", render: (r) => <span className="flex items-center gap-2 font-medium">{r.fullName}<StatusChip tone="neutral">{r.role === "owner" ? "Owner" : "Farmhand"}</StatusChip></span> },
  { key: "e", header: "Eggs", numeric: true, hideOnMobile: true, render: (r) => r.eggs },
  { key: "m", header: "Deaths", numeric: true, hideOnMobile: true, render: (r) => r.mortality },
  { key: "f", header: "Feed", numeric: true, hideOnMobile: true, render: (r) => r.feed },
  { key: "v", header: "Vaccines", numeric: true, hideOnMobile: true, render: (r) => r.vaccinations },
  { key: "t", header: "Entries", numeric: true, render: (r) => r.total },
  { key: "l", header: "Last entry", render: (r) => when(r.lastEntryAt) ?? <span className="text-stone-500">None</span> },
];

const auditCols: Column<AuditEntry>[] = [
  { key: "t", header: "When", className: "whitespace-nowrap", render: (r) => when(r.at) },
  { key: "w", header: "Who", render: (r) => r.actorName },
  { key: "d", header: "What happened", render: (r) => { const d = describeAudit(r); return <span className="flex flex-col"><span className="font-medium">{d.title}</span>{d.detail ? <span className="text-xs text-stone-600">{d.detail}</span> : null}</span>; } },
];

export function TeamView({ staff, audit, mfa, days }: { staff: StaffRow[]; audit: AuditEntry[]; mfa: ReactNode; days: number }) {
  return (
    <>
      <PageHeader eyebrow="Governance" title="Team and audit" description="Who is recording, what changed, and how your own account is protected." />
      <section className="flex flex-col gap-4">
        <SectionHeading title="Your sign-in security" />
        {mfa}
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeading title={`Team activity, last ${days} days`} description="Entries each person recorded. A quiet day shows here before it shows in the numbers." />
        <DataTable caption="Team activity" columns={staffCols} rows={staff} rowKey={(r) => r.personId} empty={<p className="text-stone-700">No activity yet.</p>} />
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeading title="Audit trail" description="Every change to money, flocks, customers and people. It is written by the database and nobody, including you, can edit or delete it." />
        <DataTable caption="Audit trail" columns={auditCols} rows={audit} rowKey={(r) => String(r.id)} empty={<p className="text-stone-700">Nothing has changed yet.</p>} />
      </section>
    </>
  );
}
