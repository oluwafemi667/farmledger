/** Where "Back" goes from a page that has no obvious history, and what to call it. */
const ROOTS = new Set(["/overview", "/today", "/flocks", "/stock", "/sales", "/reports", "/team", "/log", "/history"]);

const LABELS: Record<string, string> = {
  "/overview": "Overview", "/today": "Today", "/flocks": "Flocks", "/stock": "Stock", "/sales": "Sales and money",
  "/reports": "Reports", "/team": "Team and audit", "/log": "Log", "/history": "History",
};

export interface BackTarget { href: string; label: string }

/** null on a top-level screen, where a back button would only be clutter. */
export function backTarget(pathname: string): BackTarget | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (ROOTS.has(path) || path === "/") return null;
  const parts = path.split("/").filter(Boolean);
  // Invoice pages sit under /sales; there is no /sales/invoices list of their own.
  const parent = parts[0] === "sales" && parts[1] === "invoices" ? "/sales" : "/" + parts.slice(0, -1).join("/");
  const href = ROOTS.has(parent) ? parent : "/" + parts[0];
  return { href, label: LABELS[href] ?? "Back" };
}
