#!/bin/bash
# Active / désactive le VPN côté serveur (sans supprimer le device)

source "$(dirname "$0")/lib.sh"
parse_args "$@"

[[ -n "$DEVICE_ID" ]] || log_err "device-id requis"
[[ -n "$ENABLED" ]] || log_err "enabled requis (yes|no)"

DISABLED_DEVICES="${DATA_DIR}/disabled-devices.conf"
touch "$DISABLED_DEVICES"

if [[ "$ENABLED" == "no" ]]; then
  if ! grep -qx "$DEVICE_ID" "$DISABLED_DEVICES" 2>/dev/null; then
    echo "$DEVICE_ID" >> "$DISABLED_DEVICES"
  fi
  log_ok "VPN désactivé pour ${DEVICE_ID}"
elif [[ "$ENABLED" == "yes" ]]; then
  sed -i "/^${DEVICE_ID}$/d" "$DISABLED_DEVICES" 2>/dev/null || true
  log_ok "VPN activé pour ${DEVICE_ID}"
else
  log_err "enabled doit être yes ou no"
fi

"$(dirname "$0")/sync-classic-auth.sh"
