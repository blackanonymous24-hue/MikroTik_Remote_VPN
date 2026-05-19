import { prisma } from "@/lib/prisma";
import {
  buildProvisionPayload,
  getProvisioner,
} from "@/lib/provisioning";
import { resolveVpnServer } from "@/lib/provisioning/provision-service";
import type { DeviceStatus } from "@prisma/client";

export type DevicePingResult = {
  online: boolean;
  status: DeviceStatus;
  latencyMs: number | null;
  message: string;
};

/**
 * Ping MikroTik — exécuté côté serveur (API), jamais dans le navigateur.
 * PC / mobile : envoient seulement la requête HTTP ; le test TCP part de la plateforme
 * ou du serveur VPN (mode local/ssh), là où le tunnel et le DNAT sont actifs.
 */
export async function pingMikrotikDevice(
  deviceId: string,
  tenantId: string
): Promise<DevicePingResult> {
  const device = await prisma.device.findFirst({
    where: { id: deviceId, tenantId },
    include: { vpnAccount: true, wireguardPeer: true, vpnServer: true },
  });

  if (!device) {
    throw new Error("DEVICE_NOT_FOUND");
  }

  if (device.provisionStatus !== "ACTIVE") {
    return {
      online: false,
      status: "OFFLINE",
      latencyMs: null,
      message: "Routeur non provisionné",
    };
  }

  if (!device.vpnEnabled) {
    return {
      online: false,
      status: "OFFLINE",
      latencyMs: null,
      message: "VPN désactivé sur le serveur",
    };
  }

  const server = device.vpnServer ?? (await resolveVpnServer(tenantId, device.vpnServerId));
  const host = server?.host ?? device.vpnAccount?.host ?? "vpn.nanotechvpn.com";
  const payload = buildProvisionPayload(device, host);
  const provisioner = getProvisioner(server);
  const probe = await provisioner.pingDevice(payload);

  return {
    online: probe.online,
    status: probe.online ? "ONLINE" : "OFFLINE",
    latencyMs: probe.latencyMs,
    message: probe.message,
  };
}
