/**
 * Public demo mode. Switched on only in the separate demo deployment, which points at a
 * demo-only Supabase project. Nothing here can reach the real farm: the demo project
 * holds sample data and two shared accounts, and the database itself makes the owner
 * account read-only (supabase/demo/demo-setup.sql).
 */
export type DemoRole = "owner" | "farmhand";

export const isDemoMode = (): boolean => process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const isDemoRole = (v: string): v is DemoRole => v === "owner" || v === "farmhand";

/** Server only. The password never leaves the server: visitors are signed in by the /demo route. */
export function demoCredentials(role: DemoRole): { email: string; password: string } | null {
  const password = process.env[role === "owner" ? "DEMO_OWNER_PASSWORD" : "DEMO_FARMHAND_PASSWORD"];
  if (!password) return null;
  return { email: `demo-${role}@farmledger.demo`, password };
}

export const DEMO_READONLY_MESSAGE =
  "This demo's owner view is read-only. Switch to the farmhand view to try saving a record.";
