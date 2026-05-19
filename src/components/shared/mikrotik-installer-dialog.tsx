"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/shared/copy-button";

type MikrotikInstallerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string | null;
  title: string;
};

export function MikrotikInstallerDialog({
  open,
  onOpenChange,
  deviceId,
  title,
}: MikrotikInstallerDialogProps) {
  const [fetchScript, setFetchScript] = useState("");
  const [manualScript, setManualScript] = useState("");
  const [installUrl, setInstallUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !deviceId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/devices/${deviceId}/install`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        if (cancelled) return;
        setFetchScript(data.fetchScript ?? "");
        setManualScript(data.manualScript ?? "");
        setInstallUrl(data.installUrl ?? "");
        if (data.provisionStatus !== "ACTIVE") {
          setError(
            "Provisionnez d'abord le routeur sur le serveur (bouton Provisionner ou Settings → Synchroniser)."
          );
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, deviceId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Comme Mikroot : collez la commande dans le terminal MikroTik (New Terminal).
            Le routeur télécharge et importe la configuration automatiquement.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground">Préparation du script…</p>
        )}

        {error && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800">
            {error}
          </p>
        )}

        {!loading && fetchScript && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-foreground">
                1. Installation automatique (recommandé — style Mikroot)
              </p>
              <textarea
                readOnly
                value={fetchScript}
                className="h-24 w-full resize-none rounded-lg border border-input bg-slate-950 p-3 font-mono text-xs text-emerald-400"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyButton value={fetchScript} label="Copier commande MikroTik" />
                {installUrl && <CopyButton value={installUrl} label="Copier URL" />}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                2. Script manuel (secours)
              </p>
              <textarea
                readOnly
                value={manualScript}
                className="h-40 w-full resize-none rounded-lg border border-input bg-muted/30 p-3 font-mono text-[11px]"
              />
              <div className="mt-2 flex justify-end">
                <CopyButton value={manualScript} label="Script manuel" />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
