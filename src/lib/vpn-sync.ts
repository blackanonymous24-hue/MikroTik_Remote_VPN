import "server-only";

import { prisma } from "@/lib/prisma";
import { VPN_HOST, VPN_WG_ENDPOINT } from "@/lib/config";
import { syncVpnServerFromEnvironment } from "@/lib/vpn-server-config";
import type { Device, VpnAccount, WireguardPeer } from "@prisma/client";

export type VpnSyncDeviceResult = {
  id: string;
  name: string;
  protocol: string;
  metadataUpdated: boolean;
  reprovisioned: boolean;
  success?: boolean;
  message?: string;
};

export type VpnSyncSummary = {
  serverHost: string;
  wgEndpoint: string;
  serverPublicKey: string;
  devicesUpdated: number;
  reprovisioned: number;
  failed: number;
  results: VpnSyncDeviceResult[];
};

export { syncVpnServerFromEnvironment, getWireGuardServerPublicKeyForUi } from "@/lib/vpn-server-config";

type DeviceWithVpn = Device & {
  vpnAccount: VpnAccount | null;
  wireguardPeer: WireguardPeer | null;
};

/** Met à jour host / endpoint / secret IPsec en base pour un device. */
export async function syncDeviceVpnMetadata(
  device: DeviceWithVpn,
  vpnServerId: string
) {
  const l2tpSecret = process.env.L2TP_IPSEC_SECRET?.trim();

  if (device.vpnAccount) {
    await prisma.vpnAccount.update({
      where: { id: device.vpnAccount.id },
      data: {
        host: VPN_HOST,
        ...(device.protocol === "L2TP" && l2tpSecret
          ? { ipsecSecret: l2tpSecret }
          : {}),
      },
    });
  }

  if (device.wireguardPeer) {
    await prisma.wireguardPeer.update({
      where: { id: device.wireguardPeer.id },
      data: { endpoint: VPN_WG_ENDPOINT },
    });
  }

  await prisma.device.update({
    where: { id: device.id },
    data: { vpnServerId },
  });
}

/** Synchronise tous les VPN du tenant (métadonnées + re-provisionnement serveur). */
export async function syncTenantVpns(
  tenantId: string,
  options: { reprovision?: boolean } = {}
): Promise<VpnSyncSummary> {
  const reprovision = options.reprovision !== false;
  const { provisionDevice } = await import("@/lib/provisioning/provision-service");

  const { server, serverPublicKey } = await syncVpnServerFromEnvironment();

  const devices = await prisma.device.findMany({
    where: { tenantId },
    include: { vpnAccount: true, wireguardPeer: true },
  });

  const results: VpnSyncDeviceResult[] = [];
  let reprovisioned = 0;
  let failed = 0;

  for (const device of devices) {
    await syncDeviceVpnMetadata(device, server.id);
    const entry: VpnSyncDeviceResult = {
      id: device.id,
      name: device.name,
      protocol: device.protocol,
      metadataUpdated: true,
      reprovisioned: false,
    };

    const shouldReprovision =
      reprovision &&
      (device.provisionStatus === "ACTIVE" ||
        device.provisionStatus === "FAILED");

    if (shouldReprovision) {
      const out = await provisionDevice(device.id, tenantId);
      entry.reprovisioned = true;
      entry.success = out.success;
      entry.message = out.message;
      if (out.success) reprovisioned += 1;
      else failed += 1;
    }

    results.push(entry);
  }

  return {
    serverHost: VPN_HOST,
    wgEndpoint: VPN_WG_ENDPOINT,
    serverPublicKey: serverPublicKey ?? "",
    devicesUpdated: devices.length,
    reprovisioned,
    failed,
    results,
  };
}

/** Un seul device : métadonnées + re-provisionnement. */
export async function syncDeviceVpn(tenantId: string, deviceId: string) {
  const { provisionDevice } = await import("@/lib/provisioning/provision-service");
  const { server, serverPublicKey } = await syncVpnServerFromEnvironment();

  const device = await prisma.device.findFirst({
    where: { id: deviceId, tenantId },
    include: { vpnAccount: true, wireguardPeer: true },
  });

  if (!device) throw new Error("DEVICE_NOT_FOUND");

  await syncDeviceVpnMetadata(device, server.id);

  let reprovision: { success: boolean; message: string } | null = null;
  if (
    device.provisionStatus === "ACTIVE" ||
    device.provisionStatus === "FAILED"
  ) {
    reprovision = await provisionDevice(deviceId, tenantId);
  }

  return {
    serverPublicKey: serverPublicKey ?? "",
    reprovision,
  };
}
