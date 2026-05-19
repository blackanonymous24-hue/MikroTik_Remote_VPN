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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !deviceId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setFetchScript("");

    fetch(`/api/devices/${deviceId}/install`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        if (cancelled) return;
        setFetchScript(data.fetchScript ?? "");
        if (data.error) {
          setError(data.error);
        } else if (data.provisionStatus !== "ACTIVE") {
          setError(
            "Provisionnement serveur en cours ou en échec — vérifiez Devices puis réessayez Installer."
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Collez ces lignes dans le terminal MikroTik (New Terminal). Le routeur télécharge et
            importe setup.rsc (RouterOS v7).
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground">Préparation du lien d&apos;installation…</p>
        )}

        {error && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800">
            {error}
          </p>
        )}

        {!loading && fetchScript && (
          <div>
            <textarea
              readOnly
              value={fetchScript}
              className="h-28 w-full resize-none rounded-lg border border-input bg-slate-950 p-3 font-mono text-xs leading-relaxed text-emerald-400"
            />
            <div className="mt-3 flex justify-end">
              <CopyButton value={fetchScript} label="Copier installation MikroTik" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
