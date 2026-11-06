import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  /** Numbers and money: right aligned, mono, tabular. */
  numeric?: boolean;
  /** Hide below the `md` breakpoint to keep mobile tables readable. */
  hideOnMobile?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Shown when `rows` is empty. */
  empty?: ReactNode;
  className?: string;
}

/**
 * A ledger table: strong rule under the header, hairlines between rows, no
 * zebra striping or boxes. The caption is read by screen readers and hidden
 * visually because the surrounding heading already names the table.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div
      className={cn("-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0", className)}
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-ivory-400">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "eyebrow whitespace-nowrap py-2.5 pr-4 font-medium last:pr-0",
                  col.numeric && "text-right",
                  col.hideOnMobile && "hidden md:table-cell",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="rule-b transition-colors duration-150 ease-ledger hover:bg-ivory-200/60"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-3.5 pr-4 align-baseline last:pr-0",
                    col.numeric && "figure text-right",
                    col.hideOnMobile && "hidden md:table-cell",
                    col.className,
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
