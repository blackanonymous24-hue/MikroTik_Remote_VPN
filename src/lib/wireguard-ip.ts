/**
 * Réseau WireGuard dédié — IPv4 privée peu utilisée en LAN client
 * Évite les conflits avec 192.168.x.x, 10.0.x.x, 10.10.x.x courants
 *
 * Serveur : 10.200.100.1/24 — Clients : 10.200.100.12+
 */
export const WG_NETWORK_CIDR = "10.200.100.0/24";
export const WG_SERVER_IPV4 = "10.200.100.1";
export const WG_CLIENT_PREFIX = 24;
export const WG_CLIENT_START_OCTET = 12;

/** Attribue une IPv4 client (sans masque, ex. 10.200.100.12) */
export function allocateWireGuardIpv4(deviceIndex: number): string {
  return `10.200.100.${WG_CLIENT_START_OCTET + deviceIndex}`;
}

/** Format affichage : 10.200.100.12 */
export function formatWireGuardIpv4(ip: string): string {
  return ip.split("/")[0] ?? ip;
}

/** Format MikroTik /address : 10.200.100.12/24 */
export function formatWireGuardAddressCidr(ip: string): string {
  const base = formatWireGuardIpv4(ip);
  return base.includes("/") ? base : `${base}/${WG_CLIENT_PREFIX}`;
}

export function isPrivateIpv4(value: string): boolean {
  const ip = formatWireGuardIpv4(value);
  return /^10\.200\.100\.\d{1,3}$/.test(ip);
}
