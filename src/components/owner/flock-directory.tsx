import Link from "next/link";
import { DataTable, StatusChip, type Column } from "@/components/ui";
import { formatAge } from "@/lib/domain/dates";
import { formatPercent, henDayRate } from "@/lib/domain/metrics";

export interface FlockRow {
  id: string;
  name: string;
  breed: string | null;
  house: string | null;
  activeBirds: number;
  ageDays: number;
  /** Eggs recorded today, or null when nothing has been logged yet. */
  eggsToday: number | null;
  vaccinesOverdue: number;
}

const columns: Column<FlockRow>[] = [
  {
    key: "name",
    header: "Flock",
    className: "whitespace-nowrap",
    render: (r) => (
      <Link
        href={`/flocks/${r.id}`}
        className="group flex flex-col rounded-sm"
      >
        <span className="font-medium underline-offset-4 group-hover:underline">
          {r.name}
        </span>
        <span className="text-xs text-stone-600">
          {[r.breed, r.house].filter(Boolean).join(", ") || "No breed or house set"}
        </span>
        {r.vaccinesOverdue > 0 ? (
          <span className="mt-1 w-fit md:hidden">
            <StatusChip tone="attention">Vaccine overdue</StatusChip>
          </span>
        ) : null}
      </Link>
    ),
  },
  {
    key: "birds",
    header: "Live birds",
    numeric: true,
    render: (r) => r.activeBirds.toLocaleString("en-NG"),
  },
  {
    key: "age",
    header: "Age",
    hideOnMobile: true,
    render: (r) => formatAge(r.ageDays),
  },
  {
    key: "henday",
    header: "Hen-day",
    numeric: true,
    render: (r) => {
      if (r.eggsToday === null) {
        return <span className="font-sans text-sm text-stone-600">Not logged</span>;
      }
      return `${formatPercent(henDayRate(r.eggsToday, r.activeBirds))}%`;
    },
  },
  {
    key: "attention",
    header: "Needs attention",
    hideOnMobile: true,
    render: (r) =>
      r.vaccinesOverdue > 0 ? (
        <StatusChip tone="attention">
          {r.vaccinesOverdue === 1 ? "Vaccine overdue" : `${r.vaccinesOverdue} vaccines overdue`}
        </StatusChip>
      ) : (
        <span className="text-stone-500">-</span>
      ),
  },
];

/**
 * One row per active flock: only what is needed to compare flocks and decide
 * which one to open. Everything else lives on the flock's own page.
 */
export function FlockDirectory({ rows }: { rows: FlockRow[] }) {
  return (
    <DataTable
      caption="Active flocks"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
    />
  );
}
