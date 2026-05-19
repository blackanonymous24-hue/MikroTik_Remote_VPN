"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SyncVpnButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/vpn/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec");

      toast.success(
        `${data.devicesUpdated} VPN mis à jour — ${data.reprovisioned} reprovisionné(s) sur le serveur`
      );
      if (data.failed > 0) {
        toast.warning(`${data.failed} reprovisionnement(s) en échec — voir Devices`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur synchronisation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={loading}
      onClick={handleSync}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Synchronisation…" : "Synchroniser tous les VPN"}
    </Button>
  );
}
