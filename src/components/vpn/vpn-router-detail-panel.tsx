"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DeviceStatus } from "@prisma/client";
import type { ClassicVpnDevice } from "@/components/vpn/vpn-accounts-client";

type RemoteAccess = {
  label: "Winbox" | "WebFig" | "API";
  address: string;
};

function buildRemoteAccess(device: ClassicVpnDevice): RemoteAccess[] {
  if (!device.vpnAccount) return [];
  const { host, winboxPort, webfigPort, apiPort } = device.vpnAccount;
  return [
    { label: "Winbox", address: `${host}:${winboxPort}` },
    { label: "WebFig", address: `${host}:${webfigPort}` },
    { label: "API", address: `${host}:${apiPort}` },
  ];
}

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copié`);
}

export function VpnRouterDetailPanel({ device }: { device: ClassicVpnDevice }) {
  const endpoints = buildRemoteAccess(device);
  const protocol = device.protocol;

  return (
    <div className="border-t border-border bg-slate-50/80 px-4 py-4 md:px-6">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">VPN :</span>
        <span className="rounded border border-border bg-white px-2 py-0.5 font-mono text-xs">
          {protocol}
        </span>
        {device.vpnAccount && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs">{device.vpnAccount.username}</span>
          </>
        )}
        {device.latencyMs != null && (
          <span className="ml-auto text-xs tabular-nums">{device.latencyMs} ms</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {endpoints.map((ep) => (
          <div
            key={ep.label}
            className="rounded-lg border border-border bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ep.label}
            </p>
            <p className="mt-2 font-mono text-sm font-medium text-foreground">{ep.address}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <StatusBadge status={device.status as DeviceStatus} />
              <button
                type="button"
                title="Copier"
                onClick={() => copyText(ep.address, ep.label)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
