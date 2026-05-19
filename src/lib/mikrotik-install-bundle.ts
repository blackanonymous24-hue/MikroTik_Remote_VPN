import { prisma } from "@/lib/prisma";
import { buildClassicImportFile, buildWireGuardImportFile } from "@/lib/mikrotik-scripts";
import { getWireGuardServerPublicKeyForUi } from "@/lib/vpn-sync";
import crypto from "crypto";

/** Génère ou récupère le token d'installation (lien secret type Mikroot). */
export async function ensureDeviceInstallToken(deviceId: string): Promise<string> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { installToken: true },
  });
  if (device?.installToken) return device.installToken;

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.device.update({
    where: { id: deviceId },
    data: { installToken: token },
  });
  return token;
}

export async function resolveDeviceByInstallToken(token: string) {
  return prisma.device.findFirst({
    where: { installToken: token },
    include: { vpnAccount: true, wireguardPeer: true },
  });
}

/** Contenu setup.rsc — text/plain, RouterOS v7, sans commentaires. */
export async function buildMikrotikImportFile(deviceId: string): Promise<string> {
  const device = await prisma.device.findFirst({
    where: { id: deviceId },
    include: { vpnAccount: true, wireguardPeer: true },
  });

  if (!device) throw new Error("DEVICE_NOT_FOUND");

  if (device.protocol === "WIREGUARD" && device.wireguardPeer) {
    const serverPublicKey = await getWireGuardServerPublicKeyForUi();
    if (!serverPublicKey) {
      throw new Error("WG_SERVER_PUBLIC_KEY manquante sur le serveur");
    }

    return buildWireGuardImportFile({
      privateKey: device.wireguardPeer.privateKey,
      serverPublicKey,
      vpnIp: device.wireguardPeer.vpnIp,
      endpoint: device.wireguardPeer.endpoint,
    });
  }

  if (
    device.vpnAccount &&
    (device.protocol === "L2TP" || device.protocol === "SSTP" || device.protocol === "OVPN")
  ) {
    return buildClassicImportFile({
      protocol: device.protocol,
      host: device.vpnAccount.host,
      username: device.vpnAccount.username,
      password: device.vpnAccount.password,
      ipsecSecret: device.vpnAccount.ipsecSecret,
    });
  }

  throw new Error("NO_VPN_CONFIG");
}

/** Installation MikroTik — fetch + import uniquement (pas le script complet). */
export function buildMikrotikFetchCommand(installUrl: string, useHttps = true): string {
  const mode = useHttps ? "https" : "http";
  return `/tool fetch url="${installUrl}" mode=${mode} dst-path=setup.rsc\n/import file-name=setup.rsc`;
}
