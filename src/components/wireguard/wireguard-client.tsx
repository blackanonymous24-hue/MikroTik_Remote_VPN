"use client";

import { useState } from "react";
import { Activity, Download, Info, Loader2 } from "lucide-react";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { ScriptDialog } from "@/components/shared/script-dialog";
import { WgDetailDialog } from "@/components/wireguard/wg-detail-dialog";
import { useDevicePing } from "@/hooks/use-device-ping";
import { generateWireGuardScript } from "@/lib/mikrotik-scripts";
import { formatWireGuardIpv4 } from "@/lib/wireguard-ip";
import { formatDateTime } from "@/lib/utils";
import type { DeviceStatus } from "@prisma/client";

export type WireGuardDevice = {
  id: string;
  name: string;
  status: DeviceStatus;
  latencyMs: number | null;
  wireguardPeer: {
    vpnIp: string;
    privateKey: string;
    publicKey: string;
    endpoint: string;
    lastSeenAt: string | null;
  } | null;
};

export function WireGuardClient({ devices }: { devices: WireGuardDevice[] }) {
  const { ping, pingingId, latencies } = useDevicePing();
  const [scriptOpen, setScriptOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [script, setScript] = useState("");
  const [selected, setSelected] = useState<WireGuardDevice | null>(null);

  function openInstall(device: WireGuardDevice) {
    if (!device.wireguardPeer) return;
    const peer = device.wireguardPeer;
    setScript(
      generateWireGuardScript({
        privateKey: peer.privateKey,
        publicKey: peer.publicKey,
        vpnIp: peer.vpnIp,
        endpoint: peer.endpoint,
      })
    );
    setScriptOpen(true);
  }

  function getLatency(device: WireGuardDevice) {
    if (latencies[device.id] != null) return latencies[device.id];
    return device.latencyMs;
  }

  return (
    <>
      <DataPanel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Router</TableHead>
              <TableHead>IPv4 VPN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latence</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => {
              const latency = getLatency(device);
              const isPinging = pingingId === device.id;
              return (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {device.wireguardPeer
                      ? formatWireGuardIpv4(device.wireguardPeer.vpnIp)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={device.status} />
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {latency != null ? `${latency} ms` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(device.wireguardPeer?.lastSeenAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => openInstall(device)}
                        title="Installer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          setSelected(device);
                          setDetailOpen(true);
                        }}
                        title="Détail"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                  Aucun peer WireGuard. Ajoutez un routeur depuis Devices.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataPanel>

      <ScriptDialog
        open={scriptOpen}
        onOpenChange={setScriptOpen}
        title="Installer WireGuard"
        description="Script MikroTik RouterOS"
        script={script}
      />

      {selected?.wireguardPeer && (
        <WgDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          deviceName={selected.name}
          vpnIp={selected.wireguardPeer.vpnIp}
          status={selected.status}
        />
      )}
    </>
  );
}
