#!/bin/bash
# Vérification user/pass OpenVPN — utilisateurs OVPN dans classic-users.conf

DATA_DIR="${NANOTECH_VPN_DATA:-/var/lib/nanotech-vpn}"
CLASSIC_USERS="${DATA_DIR}/classic-users.conf"
DISABLED_DEVICES="${DATA_DIR}/disabled-devices.conf"

USER="${username:-}"
PASS="${password:-}"

[[ -n "$USER" && -n "$PASS" ]] || exit 1
[[ -f "$CLASSIC_USERS" ]] || exit 1

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  device_id=$(echo "$line" | cut -d'|' -f1)
  protocol=$(echo "$line" | cut -d'|' -f2)
  u=$(echo "$line" | cut -d'|' -f3)
  p=$(echo "$line" | cut -d'|' -f4)
  [[ "$protocol" != "OVPN" ]] && continue
  if [[ -f "$DISABLED_DEVICES" ]] && grep -qx "$device_id" "$DISABLED_DEVICES" 2>/dev/null; then
    continue
  fi
  if [[ "$u" == "$USER" && "$p" == "$PASS" ]]; then
    exit 0
  fi
done < "$CLASSIC_USERS"

exit 1
