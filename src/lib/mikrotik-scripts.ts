import type { DeviceProtocol } from "@prisma/client";
import {
  WG_NETWORK_CIDR,
  formatWireGuardAddressCidr,
  formatWireGuardIpv4,
} from "@/lib/wireguard-ip";
import { VPN_OVPN_PORT, VPN_SSTP_PORT } from "@/lib/config";

type ClassicVpnParams = {
  protocol: "L2TP" | "SSTP" | "OVPN";
  host: string;
  username: string;
  password: string;
  ipsecSecret?: string | null;
  sstpPort?: number;
  ovpnPort?: number;
};

type WireGuardParams = {
  /** Clé privée du routeur MikroTik (client) */
  privateKey: string;
  /** Clé publique du serveur VPS (pas celle du routeur) */
  serverPublicKey: string;
  vpnIp: string;
  endpoint: string;
};

export function generateClassicVpnScript(params: ClassicVpnParams): string {
  const {
    protocol,
    host,
    username,
    password,
    ipsecSecret,
    sstpPort = VPN_SSTP_PORT,
    ovpnPort = VPN_OVPN_PORT,
  } = params;

  switch (protocol) {
    case "L2TP":
      return `/interface l2tp-client add name=l2tp-nanotech connect-to=${host} user=${username} password=${password} use-ipsec=yes ipsec-secret=${ipsecSecret ?? "SECRET"} disabled=no`;

    case "SSTP":
      return `/interface sstp-client add name=sstp-nanotech connect-to=${host} port=${sstpPort} user=${username} password=${password} verify-server-certificate=no disabled=no`;

    case "OVPN":
      return `/interface ovpn-client add name=ovpn-nanotech connect-to=${host} port=${ovpnPort} protocol=udp user=${username} password=${password} cipher=aes256 auth=sha256 verify-server-certificate=no disabled=no`;
  }
}

export function generateWireGuardScript(params: WireGuardParams): string {
  const [endpointHost, endpointPort] = params.endpoint.includes(":")
    ? params.endpoint.split(":")
    : [params.endpoint, "51820"];

  const addressCidr = formatWireGuardAddressCidr(params.vpnIp);
  const clientIp = formatWireGuardIpv4(params.vpnIp);

  const steps = [
    `/interface wireguard add name=wg-nanotech private-key="${params.privateKey}"`,
    `/ip address add address=${addressCidr} interface=wg-nanotech`,
    `/interface wireguard peers add interface=wg-nanotech public-key="${params.serverPublicKey}" endpoint-address=${endpointHost} endpoint-port=${endpointPort} allowed-address=${WG_NETWORK_CIDR} persistent-keepalive=25s`,
  ];

  return `# ÉTAPES OBLIGATOIRES (dans l'ordre, une commande = une ligne + Entrée)
# 1. Sur la plateforme : statut « Provisionné » (ACTIVE)
# 2. Sur le MikroTik : exécuter les 3 commandes ci-dessous
# 3. Puis Ping sur la plateforme

${steps.join("\n\n")}

# IP VPN du routeur : ${clientIp}
# Clé publique SERVEUR (dans peer) : ${params.serverPublicKey}
# Ne pas utiliser la clé publique du routeur dans public-key=`;
}

export function isClassicProtocol(
  protocol: DeviceProtocol
): protocol is "L2TP" | "SSTP" | "OVPN" {
  return protocol === "L2TP" || protocol === "SSTP" || protocol === "OVPN";
}
