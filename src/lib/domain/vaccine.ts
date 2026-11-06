import { daysBetween } from "./dates";

/** "due in 5 days", "due tomorrow", "2 days overdue". */
export function dueLabel(dueOn: string, today: string): string {
  const diff = daysBetween(today, dueOn);
  if (diff === 0) return "due today";
  if (diff === 1) return "due tomorrow";
  if (diff > 1) return `due in ${diff} days`;
  if (diff === -1) return "1 day overdue";
  return `${-diff} days overdue`;
}
