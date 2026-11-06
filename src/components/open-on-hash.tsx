"use client";
import { useEffect } from "react";

/** When the address ends in #something, open that collapsed form and bring it into view. */
export function OpenOnHash() {
  useEffect(() => {
    const go = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ block: "start" });
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
  return null;
}
