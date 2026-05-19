"use client";

import { useState } from "react";
import { Activity, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataPanel } from "@/components/shared/data-panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProvisionBadge } from "@/components/shared/provision-badge";
import { useDevicePing } from "@/hooks/use-device-ping";
import { formatDate } from "@/lib/utils";
import type { DeviceStatus, ProvisionStatus } from "@prisma/client";

export type DeviceRow = {
  id: string;
  name: string;
  protocol: string;
  status: DeviceStatus;
  provisionStatus: ProvisionStatus;
  provisionError: string | null;
  expiresAt: string | null;
  latencyMs: number | null;
};

export function DevicesClient({ devices }: { devices: DeviceRow[] }) {
  const router = useRouter();
  const { ping, pingingId, latencies } = useDevicePing();
  const [deprovisionTarget, setDeprovisionTarget] = useState<DeviceRow | null>(null);
  const [deprovisioning, setDeprovisioning] = useState(false);

  function getLatency(device: DeviceRow) {
    if (latencies[device.id] != null) return latencies[device.id];
    return device.latencyMs;
  }

  async function handleProvision(id: string) {
    try {
      const res = await fetch(`/api/devices/${id}/provision`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Échec");
      toast.success("Provisionné");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    }
  }

  async function confirmDeprovision() {
    if (!deprovisionTarget) return;
    setDeprovisioning(true);
    try {
      const res = await fetch(`/api/devices/${deprovisionTarget.id}/deprovision`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success("Déprovisionné");
      setDeprovisionTarget(null);
      router.refresh();
    } catch {
      toast.error("Échec");
    } finally {
      setDeprovisioning(false);
    }
  }

  return (
    <>
      <DataPanel className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Proto</TableHead>
              <TableHead>Expire</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Provision</TableHead>
              <TableHead>ms</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => {
              const isPinging = pingingId === device.id;
              const latency = getLatency(device);
              return (
                <TableRow key={device.id}>
                  <TableCell className="max-w-[140px] truncate font-medium">
                    {device.name}
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      {device.protocol}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(device.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={device.status} />
                  </TableCell>
                  <TableCell>
                    <ProvisionBadge status={device.provisionStatus} />
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {latency != null ? latency : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={isPinging}
                        onClick={() => ping(device.id)}
                        title="Ping"
                      >
                        {isPinging ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Activity className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {device.provisionStatus !== "ACTIVE" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleProvision(device.id)}
                          title="Provisionner"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <div className="ml-2 border-l border-border pl-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeprovisionTarget(device)}
                            title="Déprovisionner"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                  Aucun routeur.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataPanel>

      <ConfirmDialog
        open={deprovisionTarget != null}
        onOpenChange={(open) => !open && !deprovisioning && setDeprovisionTarget(null)}
        title="Déprovisionner ce routeur ?"
        description={
          deprovisionTarget
            ? `Les accès VPN de « ${deprovisionTarget.name} » seront retirés du serveur. Cette action est réversible en reprovisionnant.`
            : ""
        }
        confirmLabel="Déprovisionner"
        loading={deprovisioning}
        onConfirm={confirmDeprovision}
      />
    </>
  );
}
