import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";
import { FailureLimiter } from "./rate-limit";

describe("buildCsp", () => {
  const csp = buildCsp({ nonce: "abc123", supabaseUrl: "https://proj.supabase.co" });
  it("allows only this origin's and nonced scripts, never unsafe-eval in production", () => {
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
  });
  it("forbids framing, plugins and foreign form posts", () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
  });
  it("limits network access to this origin and the Supabase project", () => {
    expect(csp).toContain("connect-src 'self' https://proj.supabase.co wss://proj.supabase.co");
  });
  it("relaxes only what development needs", () => {
    const dev = buildCsp({ nonce: "n", dev: true });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });
});

describe("FailureLimiter", () => {
  const rule = { max: 3, windowMs: 1000 };
  it("blocks after the maximum failures and reports the wait", () => {
    const l = new FailureLimiter(rule);
    for (let i = 0; i < 3; i++) l.fail("k", 0);
    expect(l.check("k", 500)).toEqual({ blocked: true, retryAfterSec: 1 });
  });
  it("forgets failures once the window passes", () => {
    const l = new FailureLimiter(rule);
    for (let i = 0; i < 3; i++) l.fail("k", 0);
    expect(l.check("k", 1001).blocked).toBe(false);
  });
  it("keeps keys independent and clears on success", () => {
    const l = new FailureLimiter(rule);
    for (let i = 0; i < 3; i++) l.fail("a", 0);
    expect(l.check("b", 1).blocked).toBe(false);
    l.clear("a");
    expect(l.check("a", 1).blocked).toBe(false);
  });
  it("stays bounded under a flood of distinct keys", () => {
    const l = new FailureLimiter(rule, 10);
    for (let i = 0; i < 100; i++) l.fail(`k${i}`, 0);
    expect((l as unknown as { hits: Map<string, number[]> }).hits.size).toBeLessThanOrEqual(10);
  });
});
