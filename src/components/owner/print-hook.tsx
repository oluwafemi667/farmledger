"use client";
import { useEffect } from "react";

/** Wires any [data-print] button on the page to the browser print dialog (keeps the page itself a server component). */
export function PrintButtonHook() {
  useEffect(() => {
    const on = (e: Event) => { if ((e.target as HTMLElement).closest("[data-print]")) window.print(); };
    document.addEventListener("click", on);
    return () => document.removeEventListener("click", on);
  }, []);
  return null;
}
