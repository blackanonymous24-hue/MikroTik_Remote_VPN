"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataPanel } from "@/components/shared/data-panel";
import { ScriptDialog } from "@/components/shared/script-dialog";
import {
  DetailButton,
  InstallerButton,
  PingButton,
  VpnToggleButton,
} from "@/components/vpn/mikroot-buttons";
import { OnlineOfflineBand } from "@/components/vpn/online-offline-band";
import { VpnRouterDetailPanel } from "@/components/vpn/vpn-router-detail-panel";
import { useDevicePing } from "@/hooks/use-device-ping";
import { generateClassicVpnScript } from "@/lib/mikrotik-scripts";
import { formatDateExp } from "@/lib/utils";
import type { DeviceStatus } from "@prisma/client";

export type ClassicVpnDevice = {
  id: string;
  name: string;
  protocol: "L2TP" | "SSTP" | "OVPN";
  status: DeviceStatus;
  vpnEnabled: boolean;
  provisionStatus: string;
  expiresAt: string | null;
  latencyMs: number | null;
  vpnAccount: {
    username: string;
    password: string;
    host: string;
    ipsecSecret: string | null;
    winboxPort: number;
    webfigPort: number;
    apiPort: number;
  } | null;
};

export function VpnAccountsClient({ devices }: { devices: ClassicVpnDevice[] }) {
  const router = useRouter();
  const { ping, pingingId, latencies, resolveStatus } = useDevicePing();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassicVpnDevice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [script, setScript] = useState("");
  const [scriptTitle, setScriptTitle] = useState("");
  const [search, setSearch] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<string>("all");
  const [vpnEnabledOverrides, setVpnEnabledOverrides] = useState<Record<string, boolean>>({});
  const [togglingVpnId, setTogglingVpnId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const matchSearch =
        search === "" || d.name.toLowerCase().includes(search.toLowerCase());
      const matchProto = protocolFilter === "all" || d.protocol === protocolFilter;
      return matchSearch && matchProto;
    });
  }, [devices, search, protocolFilter]);

  function toggleDetail(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openInstall(device: ClassicVpnDevice) {
    if (!device.vpnAccount) return;
    setScript(
      generateClassicVpnScript({
        protocol: device.protocol,
        host: device.vpnAccount.host,
        username: device.vpnAccount.username,
        password: device.vpnAccount.password,
        ipsecSecret: device.vpnAccount.ipsecSecret,
      })
    );
    setScriptTitle(`Installer ${device.protocol} — ${device.name}`);
    setScriptOpen(true);
  }

  function getLatency(device: ClassicVpnDevice) {
    if (latencies[device.id] != null) return latencies[device.id];
    return device.latencyMs;
  }

  function resolveVpnEnabled(device: ClassicVpnDevice) {
    return vpnEnabledOverrides[device.id] ?? device.vpnEnabled;
  }

  async function handleProvision(deviceId: string) {
    try {
      const res = await fetch(`/api/devices/${deviceId}/provision`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Échec");
      toast.success("Provisionné sur le serveur — installez le script MikroTik");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Provisionnement échoué");
    }
  }

  async function toggleVpnServer(device: ClassicVpnDevice) {
    const current = resolveVpnEnabled(device);
    const next = !current;
    setTogglingVpnId(device.id);
    try {
      const res = await fetch(`/api/devices/${device.id}/vpn-enabled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Échec");
      setVpnEnabledOverrides((prev) => ({ ...prev, [device.id]: next }));
      toast.success(next ? "VPN activé sur le serveur" : "VPN désactivé sur le serveur");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de modifier le VPN");
    } finally {
      setTogglingVpnId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/devices/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Routeur supprimé");
      setDeleteTarget(null);
      if (expandedId === deleteTarget.id) setExpandedId(null);
      router.refresh();
    } catch {
      toast.error("Suppression impossible");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-foreground">Routeurs Mikrotik</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full min-w-[200px] rounded-md border border-input bg-card pl-8 pr-3 text-sm sm:w-52"
            />
          </div>
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2.5 text-sm"
          >
            <option value="all">Tous protocoles</option>
            <option value="L2TP">L2TP</option>
            <option value="SSTP">SSTP</option>
            <option value="OVPN">OVPN</option>
          </select>
          <Link
            href="/devices"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter un routeur
          </Link>
        </div>
      </div>

      <DataPanel className="divide-y divide-border">
        {filtered.map((device) => {
          const isExpanded = expandedId === device.id;
          const isPinging = pingingId === device.id;
          const isTogglingVpn = togglingVpnId === device.id;
          const vpnEnabled = resolveVpnEnabled(device);
          const canToggleVpn = device.provisionStatus === "ACTIVE";
          const displayStatus = resolveStatus(device.id, device.status);
          const deviceWithLatency = {
            ...device,
            status: displayStatus,
            latencyMs: getLatency(device) ?? device.latencyMs,
          };

          return (
            <div key={device.id} className="bg-card">
              <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{device.name}</span>
                  <button
                    type="button"
                    className="text-primary hover:opacity-80"
                    title="Renommer (bientôt)"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    ( exp. {formatDateExp(device.expiresAt)} )
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <div className="flex items-center gap-2">
                    <OnlineOfflineBand status={displayStatus} />
                    <PingButton loading={isPinging} onClick={() => ping(device.id)} />
                    <VpnToggleButton
                      enabled={vpnEnabled}
                      loading={isTogglingVpn}
                      disabled={!canToggleVpn}
                      onClick={() => toggleVpnServer(device)}
                    />
                    {device.provisionStatus === "ACTIVE" ? (
                      <InstallerButton onClick={() => openInstall(device)} />
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={() => handleProvision(device.id)}
                      >
                        Provisionner
                      </Button>
                    )}
                    <DetailButton active={isExpanded} onClick={() => toggleDetail(device.id)} />
                  </div>
                  <div className="ml-1 border-l border-border pl-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Supprimer le routeur"
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(device)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && <VpnRouterDetailPanel device={deviceWithLatency} />}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            Aucun routeur VPN classique trouvé.
          </p>
        )}
      </DataPanel>

      <ScriptDialog
        open={scriptOpen}
        onOpenChange={setScriptOpen}
        title={scriptTitle}
        description="Collez dans le terminal MikroTik"
        script={script}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
        title="Supprimer ce routeur ?"
        description={
          deleteTarget
            ? `Le routeur « ${deleteTarget.name} » et son compte VPN seront définitivement supprimés.`
            : ""
        }
        confirmLabel="Supprimer"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
