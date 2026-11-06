"use client";

import { Button, Notice } from "@/components/ui";
import type { SubmitStatus } from "./use-record-submit";

/** Failure message plus the Save button, identical on every log form. */
export function SubmitBar({
  status,
  failure,
  onSubmit,
  label,
}: {
  status: SubmitStatus;
  failure: { message: string; retryable: boolean } | null;
  onSubmit: () => void;
  label: string;
}) {
  const retry = status === "failed" && failure?.retryable;
  return (
    <div className="flex flex-col gap-4">
      {failure ? (
        <Notice
          tone={failure.retryable ? "attention" : "danger"}
          title={failure.retryable ? "Not saved yet" : "Could not save"}
        >
          {failure.message}
        </Notice>
      ) : null}
      <Button size="lg" block loading={status === "saving"} onClick={onSubmit}>
        {status === "saving" ? "Saving" : retry ? "Try again" : label}
      </Button>
    </div>
  );
}
