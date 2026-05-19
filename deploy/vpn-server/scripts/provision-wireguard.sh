#!/bin/bash
# Provisionnement peer WireGuard sur le serveur

source "$(dirname "$0")/lib.sh"
parse_args "$@"

[[ -n "$DEVICE_ID" ]] || log_err "device-id requis"
[[ -n "$PUBLIC_KEY" ]] || log_err "public-key requis"
[[ -n "$VPN_IP" ]] || log_err "vpn-ip requis"

WG_IF="${WG_INTERFACE:-wg0}"
VPN_IP_CLEAN="${VPN_IP%%/*}"
ENTRY="${DEVICE_ID}|${PUBLIC_KEY}|${VPN_IP_CLEAN}"

if ! grep -q "^${DEVICE_ID}|" "$WG_PEERS" 2>/dev/null; then
  echo "$ENTRY" >> "$WG_PEERS"
else
  sed -i "s|^${DEVICE_ID}|.*|${ENTRY}|" "$WG_PEERS"
fi

# Ajout peer via wg si interface existe
if command -v wg &>/dev/null && ip link show "$WG_IF" &>/dev/null; then
  wg set "$WG_IF" peer "$PUBLIC_KEY" allowed-ips "${VPN_IP_CLEAN}/32" persistent-keepalive 25 2>/dev/null || \
    log_err "Impossible d'ajouter le peer WireGuard"
  log_ok "WireGuard peer ajouté: ${VPN_IP} sur ${WG_IF}"
else
  log_ok "WireGuard peer enregistré (interface ${WG_IF} non active — redémarrer wg-quick@${WG_IF})"
fi
