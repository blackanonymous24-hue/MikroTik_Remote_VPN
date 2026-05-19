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
  privateKey: string;
  publicKey: string;
  vpnIp: string;
  endpoint: string;
};

export function generateClassicVpnScript(params: ClassicVpnParams): string {
  const { protocol, host, username, password, ipsecSecret } = params;

  switch (protocol) {
    case "L2TP":
      return `/interface l2tp-client add \\
name=l2tp-vpn \\
connect-to=${host} \\
user=${username} \\
password=${password} \\
use-ipsec=yes \\
ipsec-secret=${ipsecSecret ?? "SECRET"} \\
disabled=no`;

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

  return `/interface wireguard add \\
name=wg-nanotech \\
private-key="${params.privateKey}"

/ip address add \\
address=${addressCidr} \\
interface=wg-nanotech

/interface wireguard peers add \\
interface=wg-nanotech \\
public-key="${params.publicKey}" \\
endpoint=${endpointHost}:${endpointPort} \\
allowed-address=${WG_NETWORK_CIDR} \\
persistent-keepalive=25

# IPv4 VPN du routeur : ${clientIp} (réseau ${WG_NETWORK_CIDR})`;
}

export function isClassicProtocol(
  protocol: DeviceProtocol
): protocol is "L2TP" | "SSTP" | "OVPN" {
  return protocol === "L2TP" || protocol === "SSTP" || protocol === "OVPN";
}
