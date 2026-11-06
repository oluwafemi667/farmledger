"use client";

import Link from "next/link";
import { Button, Notice } from "@/components/ui";

/** Shown after a successful save instead of the form, so it cannot be re-sent by accident. */
export function SavedPanel({
  title,
  detail,
  onAnother,
  anotherLabel = "Record another",
  todayHref = "/today",
  queued = false,
}: {
  title: string;
  detail?: string;
  onAnother: () => void;
  anotherLabel?: string;
  todayHref?: string;
  /** Stored on this device, not yet on the server. */
  queued?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="success" title={title}>
        {detail}
      </Notice>
      {queued ? (
        <Notice tone="info" title="Saved on this phone">
          There is no signal right now. It is stored safely and will upload by itself when you are back online. You can keep working.
        </Notice>
      ) : null}
      <div className="flex flex-col gap-3">
        <Button size="lg" block onClick={onAnother}>
          {anotherLabel}
        </Button>
        <Link
          href={todayHref}
          className="flex min-h-touch items-center justify-center rounded border border-ivory-400 bg-ivory-50 text-base font-medium transition-colors duration-150 ease-ledger hover:bg-ivory-200"
        >
          Back to Today
        </Link>
      </div>
    </div>
  );
}
