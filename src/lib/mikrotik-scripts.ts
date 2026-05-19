import type { DeviceProtocol } from "@prisma/client";
import {
  WG_NETWORK_CIDR,
  formatWireGuardAddressCidr,
  formatWireGuardIpv4,
} from "@/lib/wireguard-ip";
import { VPN_HOST, VPN_OVPN_PORT, VPN_SSTP_PORT } from "@/lib/config";
import {
  ROS7_INTERFACE,
  assertRos7Script,
  parseWireGuardEndpoint,
  quoteRos7,
  toRos7ImportFile,
} from "@/lib/mikrotik-ros7";

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
  privateKey: string;
  serverPublicKey: string;
  vpnIp: string;
  endpoint: string;
};

/** Commandes RouterOS v7 (une ligne = une commande, import .rsc). */
export function buildClassicVpnCommands(params: ClassicVpnParams): string[] {
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
      return [
        `/interface l2tp-client remove [find name=${ROS7_INTERFACE.l2tp}]`,
        `/interface l2tp-client add name=${ROS7_INTERFACE.l2tp} connect-to=${host} user=${quoteRos7(username)} password=${quoteRos7(password)} use-ipsec=yes ipsec-secret=${quoteRos7(ipsecSecret ?? "SECRET")} disabled=no`,
      ];
    case "SSTP": {
      const portPart = sstpPort !== 443 ? ` port=${sstpPort}` : "";
      return [
        `/interface sstp-client remove [find name=${ROS7_INTERFACE.sstp}]`,
        `/interface sstp-client add name=${ROS7_INTERFACE.sstp} connect-to=${host}${portPart} user=${quoteRos7(username)} password=${quoteRos7(password)} verify-server-certificate=no disabled=no`,
      ];
    }
    case "OVPN": {
      const portPart = ovpnPort !== 1194 ? ` port=${ovpnPort}` : "";
      return [
        `/interface ovpn-client remove [find name=${ROS7_INTERFACE.ovpn}]`,
        `/interface ovpn-client add name=${ROS7_INTERFACE.ovpn} connect-to=${host}${portPart} protocol=udp user=${quoteRos7(username)} password=${quoteRos7(password)} verify-server-certificate=no disabled=no`,
      ];
    }
  }
}

/** WireGuard RouterOS v7 — endpoint-address + endpoint-port (jamais endpoint=host:port). */
export function buildWireGuardCommands(params: WireGuardParams): string[] {
  const { host, port } = parseWireGuardEndpoint(params.endpoint);
  const addressCidr = formatWireGuardAddressCidr(params.vpnIp);
  const ifName = ROS7_INTERFACE.wireguard;

  return [
    `/interface wireguard peers remove [find interface=${ifName}]`,
    `/ip address remove [find interface=${ifName}]`,
    `/interface wireguard remove [find name=${ifName}]`,
    `/interface wireguard add name=${ifName} private-key=${quoteRos7(params.privateKey)}`,
    `/ip address add address=${addressCidr} interface=${ifName}`,
    `/interface wireguard peers add interface=${ifName} public-key=${quoteRos7(params.serverPublicKey)} endpoint-address=${host} endpoint-port=${port} allowed-address=${WG_NETWORK_CIDR} persistent-keepalive=25s`,
  ];
}

/** @deprecated Utiliser buildClassicVpnCommands — conservé pour compatibilité interne */
export function generateClassicVpnScript(params: ClassicVpnParams): string {
  return toRos7ImportFile(buildClassicVpnCommands(params));
}

/** @deprecated Utiliser buildWireGuardCommands */
export function generateWireGuardScript(params: WireGuardParams): string {
  return toRos7ImportFile(buildWireGuardCommands(params));
}

export function buildWireGuardImportFile(params: WireGuardParams): string {
  return toRos7ImportFile(buildWireGuardCommands(params));
}

export function buildClassicImportFile(params: ClassicVpnParams): string {
  return toRos7ImportFile(buildClassicVpnCommands(params));
}

export function getWireGuardVpnIpDisplay(vpnIp: string): string {
  return formatWireGuardIpv4(vpnIp);
}

export function isClassicProtocol(
  protocol: DeviceProtocol
): protocol is "L2TP" | "SSTP" | "OVPN" {
  return protocol === "L2TP" || protocol === "SSTP" || protocol === "OVPN";
}

/** Vérifie les scripts avant envoi au routeur. */
export function validateMikrotikScript(script: string): boolean {
  try {
    assertRos7Script(script);
    return true;
  } catch {
    return false;
  }
}

export { ROS7_INTERFACE, VPN_HOST };
