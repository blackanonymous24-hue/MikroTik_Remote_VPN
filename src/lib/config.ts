/**
 * nanotechvpn.com — domaine du projet (1 seul achat)
 * - Plateforme SaaS : nanotechvpn.com
 * - Serveur VPN      : vpn.nanotechvpn.com
 */
export const APP_DOMAIN =
  process.env.NEXT_PUBLIC_APP_DOMAIN ?? "nanotechvpn.com";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? `https://${APP_DOMAIN}`;

export const VPN_HOST =
  process.env.NEXT_PUBLIC_VPN_HOST ?? "vpn.nanotechvpn.com";

export const VPN_WG_ENDPOINT =
  process.env.NEXT_PUBLIC_VPN_WG_ENDPOINT ?? `${VPN_HOST}:51820`;
