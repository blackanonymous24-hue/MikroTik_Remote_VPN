import Link from "next/link";
import { Activity, Router, Shield, Wifi } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getDashboardStats, listDevicesForTenant } from "@/lib/device-service";
import { PageHeader } from "@/components/layout/page-header";
import { DataPanel } from "@/components/shared/data-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [stats, devices] = await Promise.all([
    getDashboardStats(session.tenantId),
    listDevicesForTenant(session.tenantId),
  ]);

  const statCards = [
    { label: "Routeurs", value: stats.total, icon: Router },
    { label: "En ligne", value: stats.online, icon: Wifi },
    { label: "Classiques", value: stats.classic, icon: Shield },
    { label: "WireGuard", value: stats.wireguard, icon: Activity },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${session.name ?? session.email}`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-xl font-bold leading-tight tabular-nums">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">Routeurs récents</h2>
        <Link href="/devices" className="text-xs text-primary hover:underline">
          Voir tout
        </Link>
      </div>

      <DataPanel>
        <div className="divide-y divide-border">
          {devices.slice(0, 5).map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.protocol} · {formatDate(d.expiresAt)}
                  {d.latencyMs != null && ` · ${d.latencyMs} ms`}
                </p>
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
          {devices.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Aucun routeur —{" "}
              <Link href="/devices" className="text-primary hover:underline">
                Ajouter
              </Link>
            </p>
          )}
        </div>
      </DataPanel>
    </>
  );
}
