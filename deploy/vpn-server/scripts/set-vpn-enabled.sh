#!/bin/bash
# Active / désactive le VPN côté serveur (sans supprimer le device)

source "$(dirname "$0")/lib.sh"
parse_args "$@"

[[ -n "$DEVICE_ID" ]] || log_err "device-id requis"
[[ -n "$ENABLED" ]] || log_err "enabled requis (yes|no)"

DISABLED_DEVICES="${DATA_DIR}/disabled-devices.conf"
touch "$DISABLED_DEVICES"

apply_classic_disable() {
  local username="$1"
  if [[ -n "$username" ]] && [[ -f /etc/ppp/chap-secrets ]]; then
    sed -i "/^${username} /d" /etc/ppp/chap-secrets
    systemctl reload xl2tpd 2>/dev/null || true
  fi
}

apply_classic_enable() {
  local line="$1"
  local protocol username password
  protocol=$(echo "$line" | cut -d'|' -f2)
  username=$(echo "$line" | cut -d'|' -f3)
  password=$(echo "$line" | cut -d'|' -f4)
  local ipsec
  ipsec=$(echo "$line" | cut -d'|' -f5)

  if [[ "$protocol" == "L2TP" ]] && [[ -f /etc/ppp/chap-secrets ]] && [[ -n "$username" ]]; then
    if ! grep -q "^${username} " /etc/ppp/chap-secrets; then
      echo "${username}  l2tpd  ${password}  *" >> /etc/ppp/chap-secrets
    fi
    systemctl reload xl2tpd 2>/dev/null || true
  fi
  if [[ -n "$ipsec" ]] && [[ "$ipsec" != "SECRET" ]] && [[ -f /etc/ipsec.secrets ]]; then
    if ! grep -q "%any : PSK" /etc/ipsec.secrets 2>/dev/null; then
      echo "%any %any : PSK \"${ipsec}\"" >> /etc/ipsec.secrets
    fi
    systemctl reload strongswan-starter 2>/dev/null || systemctl reload ipsec 2>/dev/null || true
  fi
}

apply_wireguard_disable() {
  local pubkey="$1"
  local wg_if="${WG_INTERFACE:-wg0}"
  if [[ -n "$pubkey" ]] && command -v wg &>/dev/null; then
    wg set "$wg_if" peer "$pubkey" remove 2>/dev/null || true
  fi
}

apply_wireguard_enable() {
  local pubkey="$1"
  local vpn_ip="$2"
  local wg_if="${WG_INTERFACE:-wg0}"
  if [[ -n "$pubkey" ]] && [[ -n "$vpn_ip" ]] && command -v wg &>/dev/null && ip link show "$wg_if" &>/dev/null; then
    wg set "$wg_if" peer "$pubkey" allowed-ips "${vpn_ip}/32" persistent-keepalive 25 2>/dev/null || true
  fi
}

if [[ "$ENABLED" == "no" ]]; then
  if ! grep -qx "$DEVICE_ID" "$DISABLED_DEVICES" 2>/dev/null; then
    echo "$DEVICE_ID" >> "$DISABLED_DEVICES"
  fi

  if [[ -f "$CLASSIC_USERS" ]]; then
    LINE=$(grep "^${DEVICE_ID}|" "$CLASSIC_USERS" 2>/dev/null | head -1)
    if [[ -n "$LINE" ]]; then
      USERNAME=$(echo "$LINE" | cut -d'|' -f3)
      apply_classic_disable "$USERNAME"
    fi
  fi

  if [[ -f "$WG_PEERS" ]]; then
    WG_LINE=$(grep "^${DEVICE_ID}|" "$WG_PEERS" 2>/dev/null | head -1)
    if [[ -n "$WG_LINE" ]]; then
      PUBKEY=$(echo "$WG_LINE" | cut -d'|' -f2)
      apply_wireguard_disable "$PUBKEY"
    fi
  fi

  log_ok "VPN désactivé pour ${DEVICE_ID}"
elif [[ "$ENABLED" == "yes" ]]; then
  sed -i "/^${DEVICE_ID}$/d" "$DISABLED_DEVICES" 2>/dev/null || true

  if [[ -f "$CLASSIC_USERS" ]]; then
    LINE=$(grep "^${DEVICE_ID}|" "$CLASSIC_USERS" 2>/dev/null | head -1)
    if [[ -n "$LINE" ]]; then
      apply_classic_enable "$LINE"
    fi
  fi

  if [[ -f "$WG_PEERS" ]]; then
    WG_LINE=$(grep "^${DEVICE_ID}|" "$WG_PEERS" 2>/dev/null | head -1)
    if [[ -n "$WG_LINE" ]]; then
      PUBKEY=$(echo "$WG_LINE" | cut -d'|' -f2)
      VPN_IP=$(echo "$WG_LINE" | cut -d'|' -f3)
      apply_wireguard_enable "$PUBKEY" "$VPN_IP"
    fi
  fi

  log_ok "VPN activé pour ${DEVICE_ID}"
else
  log_err "enabled doit être yes ou no"
fi
