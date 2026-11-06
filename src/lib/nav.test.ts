import { describe, expect, it } from "vitest";
import { backTarget } from "./nav";

describe("backTarget", () => {
  it("has none on top-level screens", () => {
    for (const p of ["/overview", "/today", "/sales", "/log", "/history"]) expect(backTarget(p)).toBeNull();
  });
  it("goes up one level", () => {
    expect(backTarget("/log/eggs")).toEqual({ href: "/log", label: "Log" });
    expect(backTarget("/flocks/new")).toEqual({ href: "/flocks", label: "Flocks" });
    expect(backTarget("/flocks/abc-123")).toEqual({ href: "/flocks", label: "Flocks" });
  });
  it("sends invoices to Sales", () => {
    expect(backTarget("/sales/invoices/new")).toEqual({ href: "/sales", label: "Sales and money" });
    expect(backTarget("/sales/invoices/9")).toEqual({ href: "/sales", label: "Sales and money" });
    expect(backTarget("/sales/ledger")).toEqual({ href: "/sales", label: "Sales and money" });
  });
});
