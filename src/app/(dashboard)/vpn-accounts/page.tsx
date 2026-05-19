import { getSession } from "@/lib/auth";
import { listClassicVpnDevices } from "@/lib/device-service";
import { VpnAccountsClient } from "@/components/vpn/vpn-accounts-client";

export default async function VpnAccountsPage() {
  const session = await getSession();
  if (!session) return null;

  const devices = await listClassicVpnDevices(session.tenantId);

  const serialized = devices.map((d) => ({
    id: d.id,
    name: d.name,
    protocol: d.protocol as "L2TP" | "SSTP" | "OVPN",
    status: d.status,
    vpnEnabled: d.vpnEnabled,
    provisionStatus: d.provisionStatus,
    expiresAt: d.expiresAt?.toISOString() ?? null,
    latencyMs: d.latencyMs,
    vpnAccount: d.vpnAccount,
  }));

  return (
    <>
      <VpnAccountsClient devices={serialized} />
    </>
  );
}
