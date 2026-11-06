"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { SyncChip } from "@/components/ui";
import { getOutbox } from "@/lib/data/outbox-client";

/**
 * Runs the background sync and shows its state. Records upload when the app opens,
 * when the connection returns, when the screen comes back, and every 30 seconds.
 */
export function SyncIndicator() {
  const outbox = getOutbox();
  const snap = useSyncExternalStore(outbox.subscribe, outbox.getSnapshot, outbox.getSnapshot);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const flush = () => void outbox.flush();
    const up = () => { setOnline(true); flush(); };
    const down = () => setOnline(false);
    const visible = () => { if (document.visibilityState === "visible") flush(); };
    void outbox.refresh().then(flush);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    document.addEventListener("visibilitychange", visible);
    const t = setInterval(flush, 30_000);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(t);
    };
  }, [outbox]);

  if (snap.failed > 0) return <SyncChip state="failed" count={snap.failed} />;
  if (snap.syncing) return <SyncChip state="syncing" />;
  if (snap.waiting > 0) return <SyncChip state="waiting" count={snap.waiting} />;
  if (!online) {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 rounded border border-night-600 px-2 py-1 text-xs text-night-200">
        <WifiOff className="h-3.5 w-3.5" aria-hidden /> Offline
      </span>
    );
  }
  return null;
}
