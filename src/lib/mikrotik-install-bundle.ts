import { prisma } from "@/lib/prisma";
import { generateClassicVpnScript, generateWireGuardScript } from "@/lib/mikrotik-scripts";
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

function classicRemoveBlock(protocol: "L2TP" | "SSTP" | "OVPN"): string {
  switch (protocol) {
    case "L2TP":
      return "/interface l2tp-client remove [find name=l2tp-nanotech]";
    case "SSTP":
      return "/interface sstp-client remove [find name=sstp-nanotech]";
    case "OVPN":
      return "/interface ovpn-client remove [find name=ovpn-nanotech]";
  }
}

/** Contenu du fichier .rsc importé sur le MikroTik. */
export async function buildMikrotikImportFile(deviceId: string): Promise<string> {
  const device = await prisma.device.findFirst({
    where: { id: deviceId },
    include: { vpnAccount: true, wireguardPeer: true },
  });

  if (!device) throw new Error("DEVICE_NOT_FOUND");

  const header = `# nanoTECH VPN — ${device.name}
# Généré automatiquement — ${new Date().toISOString()}
`;

  if (device.protocol === "WIREGUARD" && device.wireguardPeer) {
    const serverPublicKey = await getWireGuardServerPublicKeyForUi();
    if (!serverPublicKey) {
      return `${header}# ERREUR: clé publique serveur WG manquante sur la plateforme
# Configurez WG_SERVER_PUBLIC_KEY sur le VPS puis resynchronisez.`;
    }

    const peer = device.wireguardPeer;
    const body = generateWireGuardScript({
      privateKey: peer.privateKey,
      serverPublicKey,
      vpnIp: peer.vpnIp,
      endpoint: peer.endpoint,
    });

    return `${header}
/interface wireguard remove [find name=wg-nanotech]
/ip address remove [find interface=wg-nanotech]
/interface wireguard peers remove [find interface=wg-nanotech]

${body.split("\n").filter((l) => !l.startsWith("#")).join("\n")}
`;
  }

  if (
    device.vpnAccount &&
    (device.protocol === "L2TP" || device.protocol === "SSTP" || device.protocol === "OVPN")
  ) {
    const script = generateClassicVpnScript({
      protocol: device.protocol,
      host: device.vpnAccount.host,
      username: device.vpnAccount.username,
      password: device.vpnAccount.password,
      ipsecSecret: device.vpnAccount.ipsecSecret,
    });

    return `${header}
${classicRemoveBlock(device.protocol)}
${script}
`;
  }

  return `${header}# Aucune configuration VPN pour ce routeur.`;
}

/** Commande type Mikroot : fetch + import en une ligne (dst-path sans extension). */
export function buildMikrotikFetchCommand(installUrl: string, useHttps = true): string {
  const mode = useHttps ? "https" : "http";
  return `/tool fetch url="${installUrl}" mode=${mode} dst-path=nanotech;/import nanotech;`;
}
