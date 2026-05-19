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
import type { DeviceStatus } from "@prisma/client";

type ClassicDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  status: DeviceStatus;
  host: string;
  winboxPort: number;
  webfigPort: number;
  apiPort: number;
};

export function ClassicDetailDialog({
  open,
  onOpenChange,
  deviceName,
  status,
  host,
  winboxPort,
  webfigPort,
  apiPort,
}: ClassicDetailDialogProps) {
  const endpoints = [
    { label: "Winbox", value: `${host}:${winboxPort}` },
    { label: "WebFig", value: `${host}:${webfigPort}` },
    { label: "API", value: `${host}:${apiPort}` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Détail — {deviceName}</DialogTitle>
          <DialogDescription>
            Accès distant via ports dédiés (VPN classique)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <div
              key={ep.label}
              className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-muted-foreground">{ep.label}</p>
                <p className="mt-1 font-mono text-sm">{ep.value}</p>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton value={ep.value} label={ep.label} />
                <StatusBadge status={status} />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
