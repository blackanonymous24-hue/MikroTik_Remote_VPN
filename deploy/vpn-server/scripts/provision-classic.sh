#!/bin/bash
# Provisionnement VPN classique (L2TP prioritaire — SSTP/OVPN enregistrés pour extension future)

source "$(dirname "$0")/lib.sh"
parse_args "$@"

[[ -n "$DEVICE_ID" ]] || log_err "device-id requis"
[[ -n "$PROTOCOL" ]] || log_err "protocol requis"
[[ -n "$USERNAME" ]] || log_err "username requis"
[[ -n "$PASSWORD" ]] || log_err "password requis"
[[ -n "$WINBOX_PORT" ]] || log_err "winbox-port requis"

if [[ "$PROTOCOL" != "L2TP" ]]; then
  echo "WARN: ${PROTOCOL} — enregistrement utilisateur seulement (serveur L2TP requis pour connexion auto)"
fi

ENTRY="${DEVICE_ID}|${PROTOCOL}|${USERNAME}|${PASSWORD}|${IPSEC_SECRET:-SECRET}|${ROUTER_VPN_IP:-}"
if ! grep -q "^${DEVICE_ID}|" "$CLASSIC_USERS" 2>/dev/null; then
  echo "$ENTRY" >> "$CLASSIC_USERS"
else
  sed -i "s|^${DEVICE_ID}|.*|${ENTRY}|" "$CLASSIC_USERS"
fi

# L2TP + IPsec
if [[ "$PROTOCOL" == "L2TP" ]]; then
  if [[ -f /etc/ppp/chap-secrets ]]; then
    sed -i "/^${USERNAME} /d" /etc/ppp/chap-secrets 2>/dev/null || true
    if [[ -n "$ROUTER_VPN_IP" ]]; then
      echo "${USERNAME}  l2tpd  ${PASSWORD}  ${ROUTER_VPN_IP}" >> /etc/ppp/chap-secrets
    else
      echo "${USERNAME}  l2tpd  ${PASSWORD}  *" >> /etc/ppp/chap-secrets
    fi
  fi
  if [[ -f /etc/ipsec.secrets ]] && [[ -n "$IPSEC_SECRET" ]]; then
    if ! grep -q "%any %any : PSK" /etc/ipsec.secrets 2>/dev/null; then
      echo "%any %any : PSK \"${IPSEC_SECRET}\"" >> /etc/ipsec.secrets
    fi
  fi
  systemctl reload xl2tpd 2>/dev/null || true
  systemctl reload strongswan-starter 2>/dev/null || systemctl reload ipsec 2>/dev/null || true
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

log_ok "Classic VPN provisionné: ${PROTOCOL} user=${USERNAME} ip=${ROUTER_VPN_IP:-auto} ports=${WINBOX_PORT}/${WEBFIG_PORT}/${API_PORT}"
