import type { DeviceProtocol } from "@prisma/client";
import {
  WG_NETWORK_CIDR,
  formatWireGuardAddressCidr,
  formatWireGuardIpv4,
} from "@/lib/wireguard-ip";

type ClassicVpnParams = {
  protocol: "L2TP" | "SSTP" | "OVPN";
  host: string;
  username: string;
  password: string;
  ipsecSecret?: string | null;
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
  const { protocol, host, username, password, ipsecSecret } = params;

  switch (protocol) {
    case "L2TP":
      return `# Une commande à la fois dans le terminal MikroTik
/interface l2tp-client add name=l2tp-vpn connect-to=${host} user=${username} password=${password} use-ipsec=yes ipsec-secret=${ipsecSecret ?? "SECRET"} disabled=no`;

    case "SSTP":
      return `/interface sstp-client add \\
name=sstp-vpn \\
connect-to=${host} \\
user=${username} \\
password=${password} \\
disabled=no`;

    case "OVPN":
      return `/interface ovpn-client add \\
name=ovpn-vpn \\
connect-to=${host} \\
user=${username} \\
password=${password} \\
disabled=no`;
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
