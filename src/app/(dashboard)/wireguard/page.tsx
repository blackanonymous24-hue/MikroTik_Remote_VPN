import { getSession } from "@/lib/auth";
import { listWireGuardDevices } from "@/lib/device-service";
import { PageHeader } from "@/components/layout/page-header";
import { WireGuardClient } from "@/components/wireguard/wireguard-client";

export default async function WireGuardPage() {
  const session = await getSession();
  if (!session) return null;

  const devices = await listWireGuardDevices(session.tenantId);

  const serialized = devices.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    latencyMs: d.latencyMs,
    wireguardPeer: d.wireguardPeer
      ? {
          ...d.wireguardPeer,
          lastSeenAt: d.wireguardPeer.lastSeenAt?.toISOString() ?? null,
        }
      : null,
  }));

  return (
    <>
      <PageHeader
        title="WireGuard"
        description="Peers WireGuard — accès unifié via IP VPN"
      />
      <WireGuardClient devices={serialized} />
    </>
  );
}
