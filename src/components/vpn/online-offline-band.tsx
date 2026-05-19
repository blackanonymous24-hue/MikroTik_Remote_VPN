"use client";

import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@prisma/client";

/** Bande statut Online/Offline (lecture seule — mise à jour via Ping). */
export function OnlineOfflineBand({ status }: { status: DeviceStatus }) {
  const online = status === "ONLINE";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex h-8 min-w-[4.75rem] items-center justify-center rounded-full px-3 text-[10px] font-semibold text-white shadow-sm transition-colors duration-300",
        online ? "bg-emerald-500" : "bg-slate-400"
      )}
    >
      {online ? "Online" : "Offline"}
    </div>
  );
}
