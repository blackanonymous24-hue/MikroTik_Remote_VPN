import "server-only";

import { prisma } from "@/lib/prisma";
import { VPN_HOST, VPN_WG_ENDPOINT } from "@/lib/config";

const DEFAULT_SERVER_ID = "default-server";
/** Clé publique WireGuard du serveur VPS (peer côté MikroTik). */
export function readWireGuardServerPublicKey(): string {
  return (
    process.env.WG_SERVER_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_WG_SERVER_PUBLIC_KEY?.trim() ||
    ""
  );
}

export function parseWireGuardPort(): number {
  const endpoint = VPN_WG_ENDPOINT;
  const port = endpoint.includes(":") ? endpoint.split(":").pop() : "51820";
  const n = Number(port);
  return Number.isFinite(n) && n > 0 ? n : 51820;
}

/** Met à jour le serveur VPN par défaut (host, clé WG) depuis .env / fichier VPS. */
export async function syncVpnServerFromEnvironment() {
  const wgPublicKey = readWireGuardServerPublicKey();
  const wgPort = parseWireGuardPort();

  const server = await prisma.vpnServer.upsert({
    where: { id: DEFAULT_SERVER_ID },
    update: {
      host: VPN_HOST,
      wgPublicKey: wgPublicKey || null,
      wgPort,
      provisionPath: process.env.VPN_PROVISION_PATH ?? "/opt/nanotech-vpn",
    },
    create: {
      id: DEFAULT_SERVER_ID,
      name: "nanoTECH VPN",
      host: VPN_HOST,
      wgPublicKey: wgPublicKey || null,
      wgPort,
      sshHost: process.env.VPN_SSH_HOST ?? "127.0.0.1",
      sshUser: process.env.VPN_SSH_USER ?? "root",
      sshPort: Number(process.env.VPN_SSH_PORT ?? 22),
      provisionPath: process.env.VPN_PROVISION_PATH ?? "/opt/nanotech-vpn",
      isDefault: true,
    },
  });

  return {
    server,
    serverPublicKey: server.wgPublicKey ?? wgPublicKey,
  };
}

export async function getWireGuardServerPublicKeyForUi(): Promise<string> {
  const { serverPublicKey } = await syncVpnServerFromEnvironment();
  return serverPublicKey ?? "";
}
