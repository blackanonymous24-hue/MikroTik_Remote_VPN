"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DeviceStatus } from "@prisma/client";

export function useDevicePing() {
  const router = useRouter();
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [latencies, setLatencies] = useState<Record<string, number>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<string, DeviceStatus>>({});

  const resolveStatus = useCallback(
    (deviceId: string, serverStatus: DeviceStatus): DeviceStatus =>
      statusOverrides[deviceId] ?? serverStatus,
    [statusOverrides]
  );

  const ping = useCallback(
    async (deviceId: string) => {
      setPingingId(deviceId);
      try {
        const res = await fetch(`/api/devices/${deviceId}/ping`, { method: "POST" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const status = (data.status as DeviceStatus) ?? (data.online ? "ONLINE" : "OFFLINE");
        setStatusOverrides((prev) => ({ ...prev, [deviceId]: status }));
        if (data.latencyMs != null) {
          setLatencies((prev) => ({ ...prev, [deviceId]: data.latencyMs }));
        }
        if (status === "ONLINE" && data.latencyMs != null) {
          toast.success(`MikroTik en ligne — ${data.latencyMs} ms`);
        } else {
          toast.info(data.message ?? "MikroTik hors ligne");
        }
        router.refresh();
        return data.latencyMs as number | null;
      } catch {
        setStatusOverrides((prev) => ({ ...prev, [deviceId]: "OFFLINE" }));
        toast.error("Impossible de joindre le serveur");
        return null;
      } finally {
        setPingingId(null);
      }
    },
    [router]
  );

  return { ping, pingingId, latencies, resolveStatus };
}
