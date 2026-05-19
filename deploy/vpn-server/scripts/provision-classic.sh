#!/bin/bash
# Provisionnement VPN classique : L2TP, SSTP (accel-ppp), OpenVPN

source "$(dirname "$0")/lib.sh"
parse_args "$@"

[[ -n "$DEVICE_ID" ]] || log_err "device-id requis"
[[ -n "$PROTOCOL" ]] || log_err "protocol requis"
[[ -n "$USERNAME" ]] || log_err "username requis"
[[ -n "$PASSWORD" ]] || log_err "password requis"
[[ -n "$WINBOX_PORT" ]] || log_err "winbox-port requis"

case "$PROTOCOL" in
  L2TP|SSTP|OVPN) ;;
  *) log_err "Protocole classique invalide: ${PROTOCOL}" ;;
esac

ENTRY="${DEVICE_ID}|${PROTOCOL}|${USERNAME}|${PASSWORD}|${IPSEC_SECRET:-SECRET}|${ROUTER_VPN_IP:-}"
if ! grep -q "^${DEVICE_ID}|" "$CLASSIC_USERS" 2>/dev/null; then
  echo "$ENTRY" >> "$CLASSIC_USERS"
else
  sed -i "s|^${DEVICE_ID}|.*|${ENTRY}|" "$CLASSIC_USERS"
fi

# IPsec global (L2TP uniquement)
if [[ "$PROTOCOL" == "L2TP" ]]; then
  if [[ -f /etc/ipsec.secrets ]] && [[ -n "$IPSEC_SECRET" ]]; then
    if ! grep -q "%any %any : PSK" /etc/ipsec.secrets 2>/dev/null; then
      echo "%any %any : PSK \"${IPSEC_SECRET}\"" >> /etc/ipsec.secrets
    fi
  fi
fi

FORWARD_ENTRY="${DEVICE_ID}|${WINBOX_PORT}|${WEBFIG_PORT}|${API_PORT}|${ROUTER_VPN_IP:-}"
if ! grep -q "^${DEVICE_ID}|" "$PORT_FORWARDS" 2>/dev/null; then
  echo "$FORWARD_ENTRY" >> "$PORT_FORWARDS"
else
  sed -i "s|^${DEVICE_ID}|.*|${FORWARD_ENTRY}|" "$PORT_FORWARDS"
fi

# DNAT ports publics VPS → services MikroTik (quand IP tunnel connue)
if command -v iptables &>/dev/null && [[ -n "$ROUTER_VPN_IP" ]]; then
  add_dnat() {
    local dport="$1" toport="$2"
    iptables -t nat -C PREROUTING -p tcp --dport "$dport" -j DNAT --to-destination "${ROUTER_VPN_IP}:${toport}" 2>/dev/null \
      || iptables -t nat -A PREROUTING -p tcp --dport "$dport" -j DNAT --to-destination "${ROUTER_VPN_IP}:${toport}" 2>/dev/null \
      || true
  }
  add_dnat "$WINBOX_PORT" 8291
  add_dnat "$WEBFIG_PORT" 80
  add_dnat "$API_PORT" 8728
  iptables -C FORWARD -p tcp -d "$ROUTER_VPN_IP" -j ACCEPT 2>/dev/null \
    || iptables -A FORWARD -p tcp -d "$ROUTER_VPN_IP" -j ACCEPT 2>/dev/null || true
fi

# Auth L2TP / SSTP / OVPN
"$(dirname "$0")/sync-classic-auth.sh"

log_ok "Classic VPN provisionné: ${PROTOCOL} user=${USERNAME} ip=${ROUTER_VPN_IP:-auto} ports=${WINBOX_PORT}/${WEBFIG_PORT}/${API_PORT}"
