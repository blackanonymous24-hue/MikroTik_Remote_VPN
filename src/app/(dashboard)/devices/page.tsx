import { getSession } from "@/lib/auth";
import { listDevicesForTenant } from "@/lib/device-service";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AddDeviceDialog } from "@/components/devices/add-device-dialog";
import { DevicesClient } from "@/components/devices/devices-client";
import { SyncVpnButton } from "@/components/settings/sync-vpn-button";

export default async function DevicesPage() {
  const session = await getSession();
  if (!session) return null;

  const [devices, plans] = await Promise.all([
    listDevicesForTenant(session.tenantId),
    prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } }),
  ]);

  const serialized = devices.map((d) => ({
    id: d.id,
    name: d.name,
    protocol: d.protocol,
    status: d.status,
    provisionStatus: d.provisionStatus,
    provisionError: d.provisionError,
    expiresAt: d.expiresAt?.toISOString() ?? null,
    latencyMs: d.latencyMs,
  }));

  return (
    <>
      <PageHeader
        title="Devices"
        description="Tous vos routeurs MikroTik"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SyncVpnButton compact />
            <AddDeviceDialog plans={plans.map((p) => ({ id: p.id, name: p.name }))} />
          </div>
        }
      />
      <DevicesClient devices={serialized} />
    </>
  );
}
