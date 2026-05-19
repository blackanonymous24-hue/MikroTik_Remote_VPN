"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type SyncVpnButtonProps = {
  /** Libellé court pour barres d’outils */
  compact?: boolean;
  className?: string;
};

export function SyncVpnButton({ compact = false, className }: SyncVpnButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/vpn/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec");

      toast.success(
        `${data.devicesUpdated} routeur(s) — ${data.reprovisioned} reprovisionné(s) sur le VPS`
      );
      if (data.failed > 0) {
        toast.warning(`${data.failed} échec(s) — ouvrez Devices pour le détail`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur synchronisation");
    } finally {
      setLoading(false);
    }
  }

  const label = loading
    ? "Synchronisation…"
    : compact
      ? "Synchroniser VPN"
      : "Synchroniser tous les VPN";

  return (
    <Button
      type="button"
      variant={compact ? "outline" : "outline"}
      size={compact ? "sm" : "default"}
      className={cn(compact ? "" : "w-full", className)}
      disabled={loading}
      onClick={handleSync}
      title="Met à jour le serveur VPS et reprovisionne les routeurs actifs"
    >
      <RefreshCw className={cn("h-4 w-4", loading && "animate-spin", !compact && "mr-2")} />
      {compact ? <span className="ml-1.5">{label}</span> : label}
    </Button>
  );
}
