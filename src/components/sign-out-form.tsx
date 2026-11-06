"use client";

import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";

/** Signs out and wipes the offline page copies, so the next person on a shared phone sees nothing of the last. */
export function SignOutForm({ children }: { children: ReactNode }) {
  return (
    <form
      action={signOut}
      onSubmit={() => {
        try { navigator.serviceWorker?.controller?.postMessage("clear"); } catch { /* no worker: nothing to clear */ }
      }}
    >
      {children}
    </form>
  );
}
