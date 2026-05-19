/** Pool L2TP/classique — distinct du réseau WireGuard 10.200.100.0/24 */
export const CLASSIC_VPN_POOL_START = 12;

export function allocateClassicVpnIpv4(deviceIndex: number): string {
  const octet = CLASSIC_VPN_POOL_START + (deviceIndex % 200);
  if (octet > 250) throw new Error("Pool IP classique épuisé");
  return `10.200.101.${octet}`;
}
