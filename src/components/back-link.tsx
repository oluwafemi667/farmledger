"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { backTarget } from "@/lib/nav";

/**
 * Shown above every inner page. It is a real link to the parent screen, so it works
 * without scripts, and goes to the page you actually came from when there is one.
 * `hrefPrefix` lets preview routes keep their links inside the preview.
 */
export function BackLink({ hrefPrefix = "", onDark = false }: { hrefPrefix?: string; onDark?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = backTarget(pathname.replace(hrefPrefix, "") || "/");
  if (!t) return null;
  return (
    <Link
      href={`${hrefPrefix}${t.href}`}
      onClick={(e) => {
        const here = window.location.origin;
        if (document.referrer.startsWith(here) && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className={`-mb-4 inline-flex min-h-11 w-fit items-center gap-1 rounded pr-3 text-sm font-medium underline-offset-4 hover:underline print:hidden ${onDark ? "text-signal-400" : "text-forest-800"}`}
    >
      <ChevronLeft className="h-5 w-5" aria-hidden />
      {t.label}
    </Link>
  );
}
