#!/bin/bash
# Déprovisionnement device

source "$(dirname "$0")/lib.sh"
parse_args "$@"

[[ -n "$DEVICE_ID" ]] || log_err "device-id requis"

USERNAME_FROM_LINE=""
if [[ -f "$CLASSIC_USERS" ]]; then
  LINE=$(grep "^${DEVICE_ID}|" "$CLASSIC_USERS" 2>/dev/null | head -1)
  if [[ -n "$LINE" ]]; then
    USERNAME_FROM_LINE=$(echo "$LINE" | cut -d'|' -f3)
  fi
  sed -i "/^${DEVICE_ID}|/d" "$CLASSIC_USERS"
fi

if [[ -n "${USERNAME:-}" ]]; then
  USERNAME_FROM_LINE="$USERNAME"
fi

if [[ -n "$USERNAME_FROM_LINE" ]]; then
  rm -f "/etc/openvpn/ccd/${USERNAME_FROM_LINE}" 2>/dev/null || true
fi

if [[ -f "$WG_PEERS" ]]; then
  PUBKEY=$(grep "^${DEVICE_ID}|" "$WG_PEERS" 2>/dev/null | cut -d'|' -f2)
  sed -i "/^${DEVICE_ID}|/d" "$WG_PEERS"
  WG_IF="${WG_INTERFACE:-wg0}"
  if [[ -n "$PUBKEY" ]] && command -v wg &>/dev/null; then
    wg set "$WG_IF" peer "$PUBKEY" remove 2>/dev/null || true
  fi
fi

if [[ -f "$PORT_FORWARDS" ]]; then
  LINE=$(grep "^${DEVICE_ID}|" "$PORT_FORWARDS" 2>/dev/null | head -1)
  if [[ -n "$LINE" ]]; then
    WINBOX=$(echo "$LINE" | cut -d'|' -f2)
    WEBFIG=$(echo "$LINE" | cut -d'|' -f3)
    API=$(echo "$LINE" | cut -d'|' -f4)
    ROUTER_IP=$(echo "$LINE" | cut -d'|' -f5)
    if command -v iptables &>/dev/null && [[ -n "$ROUTER_IP" ]]; then
      del_dnat() {
        iptables -t nat -D PREROUTING -p tcp --dport "$1" -j DNAT --to-destination "${ROUTER_IP}:$2" 2>/dev/null || true
      }
      del_dnat "$WINBOX" 8291
      del_dnat "$WEBFIG" 80
      del_dnat "$API" 8728
    fi
  fi
  sed -i "/^${DEVICE_ID}|/d" "$PORT_FORWARDS"
fi

"$(dirname "$0")/sync-classic-auth.sh"

log_ok "Device ${DEVICE_ID} déprovisionné"
