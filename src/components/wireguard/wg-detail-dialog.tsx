"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { getWireGuardVpnIpDisplay } from "@/lib/mikrotik-scripts";
import type { DeviceStatus } from "@prisma/client";

type WgDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  vpnIp: string;
  status: DeviceStatus;
};

export function WgDetailDialog({
  open,
  onOpenChange,
  deviceName,
  vpnIp,
  status,
}: WgDetailDialogProps) {
  const displayIp = getWireGuardVpnIpDisplay(vpnIp);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Détail — {deviceName}</DialogTitle>
          <DialogDescription>
            WireGuard : la même adresse sert pour Winbox, WebFig et API (port 8728 sur le tunnel).
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted/30 p-6">
          <p className="text-sm font-medium text-muted-foreground">Adresse VPN</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-primary">{displayIp}</p>
          <div className="mt-4 flex items-center gap-3">
            <CopyButton value={displayIp} label="Copier adresse VPN" />
            <StatusBadge status={status} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
