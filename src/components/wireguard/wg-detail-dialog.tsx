"use client";

import { WG_NETWORK_CIDR } from "@/lib/wireguard-ip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { StatusBadge } from "@/components/shared/status-badge";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Détail — {deviceName}</DialogTitle>
          <DialogDescription>
            Adresse IPv4 privée sur le tunnel WireGuard — Winbox, WebFig, API et SSH
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted/30 p-6">
          <p className="text-sm font-medium text-muted-foreground">Adresse IPv4 VPN</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-primary">{vpnIp}</p>
          <p className="mt-1 text-xs text-muted-foreground">Réseau {WG_NETWORK_CIDR}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Winbox · WebFig · API · SSH
          </p>
          <div className="mt-4 flex items-center gap-3">
            <CopyButton value={vpnIp} label="Adresse VPN" />
            <StatusBadge status={status} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
