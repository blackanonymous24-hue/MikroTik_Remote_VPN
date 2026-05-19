#!/bin/bash
# Ping MikroTik depuis le serveur VPN (TCP port API / DNAT local)

source "$(dirname "$0")/lib.sh"
parse_args "$@"

[[ -n "$DEVICE_ID" ]] || log_err "device-id requis"

DISABLED_DEVICES="${DATA_DIR}/disabled-devices.conf"
if [[ -f "$DISABLED_DEVICES" ]] && grep -qx "$DEVICE_ID" "$DISABLED_DEVICES" 2>/dev/null; then
  echo "ERROR: OFFLINE VPN désactivé"
  exit 1
fi

tcp_check() {
  local host="$1"
  local port="$2"
  local start end ms
  start=$(date +%s%3N 2>/dev/null || date +%s)
  if timeout 3 bash -c "echo >/dev/tcp/${host}/${port}" 2>/dev/null; then
    end=$(date +%s%3N 2>/dev/null || date +%s)
    if [[ "$start" =~ ^[0-9]{13}$ ]]; then
      ms=$((end - start))
    else
      ms=$(( (end - start) * 1000 ))
    fi
    echo "OK: ONLINE latency=${ms}ms host=${host} port=${port}"
    exit 0
  fi
  return 1
}

if [[ "$PROTOCOL" == "WIREGUARD" ]]; then
  VPN_IP_CLEAN="${VPN_IP%%/*}"
  [[ -n "$VPN_IP_CLEAN" ]] || log_err "OFFLINE IP VPN manquante"
  tcp_check "$VPN_IP_CLEAN" 8728 || log_err "OFFLINE MikroTik injoignable (WireGuard)"
fi

PORT="$API_PORT"
if [[ -z "$PORT" ]] && [[ -f "$PORT_FORWARDS" ]]; then
  LINE=$(grep "^${DEVICE_ID}|" "$PORT_FORWARDS" 2>/dev/null | head -1)
  PORT=$(echo "$LINE" | cut -d'|' -f4)
fi

[[ -n "$PORT" ]] || log_err "OFFLINE port API inconnu"

# Priorité : IP tunnel L2TP (API RouterOS 8728) — fiable depuis le VPS
if [[ -n "$ROUTER_VPN_IP" ]]; then
  tcp_check "$ROUTER_VPN_IP" 8728 && exit 0
fi

# Secours : port DNAT public (127.0.0.1 peut ne pas traverser PREROUTING sur Linux)
PING_TARGET="${PING_HOST:-127.0.0.1}"
tcp_check "$PING_TARGET" "$PORT" || log_err "OFFLINE MikroTik injoignable"
