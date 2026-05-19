#!/bin/bash
# Reconstruit auth L2TP / SSTP / OpenVPN depuis classic-users.conf

source "$(dirname "$0")/lib.sh"

DISABLED_DEVICES="${DATA_DIR}/disabled-devices.conf"
ACCEL_SECRETS="/etc/nanotech-vpn/accel-chap-secrets"
OVPN_CCD_DIR="/etc/openvpn/ccd"
L2TP_MARKER_BEGIN="# --- nanoTECH L2TP users (auto) ---"
L2TP_MARKER_END="# --- end nanoTECH L2TP ---"

mkdir -p "$(dirname "$ACCEL_SECRETS")" "$OVPN_CCD_DIR"
touch "$DISABLED_DEVICES"

is_disabled() {
  local id="$1"
  grep -qx "$id" "$DISABLED_DEVICES" 2>/dev/null
}

# SSTP (accel-ppp)
: > "$ACCEL_SECRETS"
chmod 600 "$ACCEL_SECRETS"

# OpenVPN CCD — supprimer les anciens fichiers nanoTECH (préfixe user_)
find "$OVPN_CCD_DIR" -maxdepth 1 -type f -name 'user_*' -delete 2>/dev/null || true

if [[ ! -f "$CLASSIC_USERS" ]]; then
  systemctl reload xl2tpd 2>/dev/null || true
  systemctl reload openvpn-server@nanotech 2>/dev/null || systemctl reload openvpn@nanotech 2>/dev/null || true
  systemctl reload accel-ppp 2>/dev/null || systemctl restart accel-ppp 2>/dev/null || true
  log_ok "sync-classic-auth: aucun utilisateur"
  exit 0
fi

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  device_id=$(echo "$line" | cut -d'|' -f1)
  protocol=$(echo "$line" | cut -d'|' -f2)
  username=$(echo "$line" | cut -d'|' -f3)
  password=$(echo "$line" | cut -d'|' -f4)
  router_ip=$(echo "$line" | cut -d'|' -f6)

  is_disabled "$device_id" && continue
  [[ -z "$username" || -z "$password" ]] && continue

  case "$protocol" in
    SSTP)
      if [[ -n "$router_ip" ]]; then
        echo "${username}  *  ${password}  ${router_ip}" >> "$ACCEL_SECRETS"
      else
        echo "${username}  *  ${password}  *" >> "$ACCEL_SECRETS"
      fi
      ;;
    OVPN)
      if [[ -n "$router_ip" ]]; then
        cat > "${OVPN_CCD_DIR}/${username}" <<EOF
ifconfig-push ${router_ip} 10.200.101.1
EOF
      fi
      ;;
  esac
done < "$CLASSIC_USERS"

# L2TP chap-secrets (bloc géré)
if [[ -f /etc/ppp/chap-secrets ]]; then
  if grep -q "$L2TP_MARKER_BEGIN" /etc/ppp/chap-secrets; then
    sed -i "/${L2TP_MARKER_BEGIN}/,/${L2TP_MARKER_END}/d" /etc/ppp/chap-secrets
  fi
  {
    echo "$L2TP_MARKER_BEGIN"
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      device_id=$(echo "$line" | cut -d'|' -f1)
      protocol=$(echo "$line" | cut -d'|' -f2)
      username=$(echo "$line" | cut -d'|' -f3)
      password=$(echo "$line" | cut -d'|' -f4)
      router_ip=$(echo "$line" | cut -d'|' -f6)
      is_disabled "$device_id" && continue
      [[ "$protocol" != "L2TP" ]] && continue
      if [[ -n "$router_ip" ]]; then
        echo "${username}  l2tpd  ${password}  ${router_ip}"
      else
        echo "${username}  l2tpd  ${password}  *"
      fi
    done < "$CLASSIC_USERS"
    echo "$L2TP_MARKER_END"
  } >> /etc/ppp/chap-secrets
fi

systemctl reload xl2tpd 2>/dev/null || true
systemctl reload strongswan-starter 2>/dev/null || systemctl reload ipsec 2>/dev/null || true
systemctl reload openvpn-server@nanotech 2>/dev/null || systemctl reload openvpn@nanotech 2>/dev/null || true
systemctl reload accel-ppp 2>/dev/null || systemctl restart accel-ppp 2>/dev/null || true

log_ok "sync-classic-auth terminé"
