"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DeviceStatus } from "@prisma/client";
import type { ClassicVpnDevice } from "@/components/vpn/vpn-accounts-client";

type Endpoint = {
  label: string;
  service: string;
  address: string;
};

function buildEndpoints(device: ClassicVpnDevice): Endpoint[] {
  if (!device.vpnAccount) return [];
  const { host, winboxPort, webfigPort, apiPort } = device.vpnAccount;
  return [
    { label: "Winbox", service: `winbox (${winboxPort})`, address: `${host}:${winboxPort}` },
    { label: "WebFig", service: `www (${webfigPort})`, address: `${host}:${webfigPort}` },
    { label: "API", service: `api (${apiPort})`, address: `${host}:${apiPort}` },
  ];
}

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copié`);
}

export function VpnRouterDetailPanel({ device }: { device: ClassicVpnDevice }) {
  const endpoints = buildEndpoints(device);
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

      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Adresse distante</th>
              <th className="px-4 py-2.5">Service (port)</th>
              <th className="px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr key={ep.label} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={ep.address}
                      className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-white px-3 font-mono text-xs"
                    />
                    <button
                      type="button"
                      title="Copier"
                      onClick={() => copyText(ep.address, ep.label)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-white hover:bg-muted"
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <select
                    disabled
                    value={ep.service}
                    className="h-9 rounded-md border border-input bg-white px-3 text-xs"
                  >
                    <option>{ep.service}</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={device.status as DeviceStatus} />
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => copyText(ep.address, ep.label)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Copier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
