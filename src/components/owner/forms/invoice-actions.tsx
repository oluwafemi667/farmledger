"use client";

import { Ban, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui";
import { voidInvoice } from "@/app/(owner)/sales/actions";
import type { ActionResult } from "@/lib/domain/commerce";

/** Void asks twice, because it cannot be undone. Only offered while nothing has been paid. */
export function InvoiceActions({
  invoiceId, canVoid, onVoid = voidInvoice,
}: { invoiceId: string; canVoid: boolean; onVoid?: (id: string) => Promise<ActionResult> }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" type="button" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Print
        </Button>
        {canVoid && !confirming ? (
          <Button variant="ghost" type="button" onClick={() => setConfirming(true)}>
            <Ban className="h-4 w-4" aria-hidden /> Void
          </Button>
        ) : null}
      </div>
      {confirming ? (
        <Notice tone="attention" title="Void this invoice?" action={
          <div className="flex gap-2">
            <Button variant="danger" type="button" loading={pending} onClick={() => start(async () => {
              const r = await onVoid(invoiceId);
              if (r.status === "saved") router.refresh();
              else setError(r.status === "invalid" ? (r.errors.form ?? "Could not void.") : r.message);
              setConfirming(false);
            })}>Void invoice</Button>
            <Button variant="secondary" type="button" onClick={() => setConfirming(false)}>Keep it</Button>
          </div>
        }>It will owe nothing and cannot take payments. The change is kept in the audit trail.</Notice>
      ) : null}
      {error ? <Notice tone="danger" title="Not voided">{error}</Notice> : null}
    </div>
  );
}
