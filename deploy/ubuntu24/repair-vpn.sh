#!/bin/bash
# Réparation complète stack VPN + .env — à lancer sur le VPS en root
# Usage: sudo bash deploy/ubuntu24/repair-vpn.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="${APP_DIR:-/var/www/nanotech-vpn}"
APP_ENV="${APP_DIR}/.env"

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "ERREUR: lancez en root"
  exit 1
fi

echo "=============================================="
echo "  nanoTECH VPN — réparation stack"
echo "=============================================="

echo ""
echo "==> 1. Services VPN (WG, L2TP, OpenVPN, SSTP)"
bash "${REPO_ROOT}/deploy/ubuntu24/setup-vpn-server.sh"

echo ""
echo "==> 2. accel-ppp (SSTP) si absent"
bash "${REPO_ROOT}/deploy/ubuntu24/install-accel-ppp.sh" 2>/dev/null || true

echo ""
echo "==> 3. Scripts provisionnement"
INSTALL_DIR="/opt/nanotech-vpn"
mkdir -p "${INSTALL_DIR}/scripts"
cp -r "${REPO_ROOT}/deploy/vpn-server/scripts/"* "${INSTALL_DIR}/scripts/"
chmod +x "${INSTALL_DIR}/scripts/"*.sh

echo ""
echo "==> 4. Clé publique WireGuard dans .env"
bash "${REPO_ROOT}/deploy/ubuntu24/update-wg-public-key.sh"

echo ""
echo "==> 5. Nettoyage .env corrompu (ancien bug install-simple)"
if [[ -f "$APP_ENV" ]]; then
  cp "$APP_ENV" "${APP_ENV}.bak.$(date +%s)"
  grep -vE '^(if |fi$|WG_SERVER_PUB=|then$|fi$|\[\[ )' "$APP_ENV" > "${APP_ENV}.tmp" || true
  mv "${APP_ENV}.tmp" "$APP_ENV"
  chown nanotech:nanotech "$APP_ENV"
  chmod 600 "$APP_ENV"
fi

SSTP_PORT="443"
[[ -f /var/lib/nanotech-vpn/sstp-port ]] && SSTP_PORT=$(tr -d '\n' < /var/lib/nanotech-vpn/sstp-port)

for key in NEXT_PUBLIC_SSTP_PORT NEXT_PUBLIC_OVPN_PORT; do
  val="1194"
  [[ "$key" == "NEXT_PUBLIC_SSTP_PORT" ]] && val="$SSTP_PORT"
  if grep -q "^${key}=" "$APP_ENV" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$APP_ENV"
  else
    echo "${key}=${val}" >> "$APP_ENV"
  fi
done

if ! grep -q '^PROVISION_MODE=local' "$APP_ENV" 2>/dev/null; then
  echo "PROVISION_MODE=local" >> "$APP_ENV"
fi

echo ""
echo "==> 6. Resynchroniser auth L2TP/SSTP/OVPN"
"${INSTALL_DIR}/scripts/sync-classic-auth.sh" || true

echo ""
echo "==> 7. Diagnostic"
bash "${REPO_ROOT}/deploy/ubuntu24/verify-vpn-stack.sh" || true

echo ""
echo "==> 8. Redémarrage application"
if id nanotech &>/dev/null; then
  sudo -u nanotech pm2 restart nanotech-vpn --update-env 2>/dev/null || \
    sudo -u nanotech pm2 start "${APP_DIR}/ecosystem.config.cjs" --update-env
  sudo -u nanotech pm2 save 2>/dev/null || true
fi

echo ""
echo "=============================================="
echo "  Terminé."
echo "  1. Site → Settings → Synchroniser tous les VPN"
echo "  2. Chaque routeur → Provisionner puis Installer"
echo "  3. MikroTik : 3 commandes WG (une ligne chacune)"
echo "=============================================="
