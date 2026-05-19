#!/bin/bash
# Diagnostic stack VPN — affiche OK / ERREUR pour chaque brique
set -uo pipefail

APP_ENV="${APP_ENV:-/var/www/nanotech-vpn/.env}"
INSTALL_DIR="${VPN_PROVISION_PATH:-/opt/nanotech-vpn}"
ERRORS=0

ok() { echo "  [OK]   $*"; }
fail() { echo "  [FAIL] $*"; ERRORS=$((ERRORS + 1)); }

echo "=== nanoTECH VPN — diagnostic serveur ==="
echo ""

echo "-- Application --"
if sudo -u nanotech pm2 describe nanotech-vpn &>/dev/null; then
  ok "PM2 nanotech-vpn (utilisateur nanotech)"
else
  fail "PM2 nanotech-vpn absent — sudo -u nanotech pm2 start /var/www/nanotech-vpn/ecosystem.config.cjs"
fi

if curl -sf "http://127.0.0.1:3000/api/health" &>/dev/null; then
  ok "API health http://127.0.0.1:3000"
else
  fail "API health ne répond pas sur le port 3000"
fi

echo ""
echo "-- Fichier .env --"
if [[ -f "$APP_ENV" ]]; then
  if grep -qE '^(if |\[\[ )' "$APP_ENV" 2>/dev/null; then
    fail ".env contient du code bash (bug install-simple) — lancez repair-vpn.sh"
  else
    ok ".env sans lignes bash parasites"
  fi
  WG_ENV=$(grep '^WG_SERVER_PUBLIC_KEY=' "$APP_ENV" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
  if [[ -n "$WG_ENV" && ${#WG_ENV} -gt 40 ]]; then
    ok "WG_SERVER_PUBLIC_KEY définie (${#WG_ENV} car.)"
  else
    fail "WG_SERVER_PUBLIC_KEY vide — bash deploy/ubuntu24/update-wg-public-key.sh"
  fi
  if grep -q '^PROVISION_MODE=local' "$APP_ENV"; then
    ok "PROVISION_MODE=local"
  else
    fail "PROVISION_MODE doit être local en production"
  fi
else
  fail ".env introuvable : $APP_ENV"
fi

echo ""
echo "-- WireGuard --"
if ip link show wg0 &>/dev/null; then
  ok "Interface wg0 active"
  WG_LIVE=$(wg show wg0 public-key 2>/dev/null | tr -d '\n')
  PEERS=$(wg show wg0 peers 2>/dev/null | wc -l)
  ok "Peers wg0 : ${PEERS}"
  if [[ -n "$WG_ENV" && -n "$WG_LIVE" && "$WG_ENV" != "$WG_LIVE" ]]; then
    fail "Clé .env != clé wg0 live — update-wg-public-key.sh puis Synchroniser"
  fi
else
  fail "wg0 inactive — systemctl start wg-quick@wg0"
fi

if ss -uln 2>/dev/null | grep -q ':51820 '; then
  ok "Port 51820/udp en écoute"
else
  fail "Port 51820/udp fermé"
fi

echo ""
echo "-- L2TP / IPsec --"
systemctl is-active --quiet xl2tpd 2>/dev/null && ok "xl2tpd actif" || fail "xl2tpd inactif"
systemctl is-active --quiet strongswan-starter 2>/dev/null || systemctl is-active --quiet ipsec 2>/dev/null \
  && ok "IPsec actif" || fail "strongswan/ipsec inactif"
ss -uln 2>/dev/null | grep -q ':1701 ' && ok "Port 1701/udp" || fail "Port 1701/udp fermé"

echo ""
echo "-- OpenVPN (OVPN) --"
systemctl is-active --quiet openvpn-server@nanotech 2>/dev/null || systemctl is-active --quiet openvpn@nanotech 2>/dev/null \
  && ok "openvpn-server@nanotech actif" || fail "OpenVPN inactif"
ss -uln 2>/dev/null | grep -q ':1194 ' && ok "Port 1194/udp" || fail "Port 1194/udp fermé"

echo ""
echo "-- SSTP --"
SSTP_PORT=443
[[ -f /var/lib/nanotech-vpn/sstp-port ]] && SSTP_PORT=$(tr -d '\n' < /var/lib/nanotech-vpn/sstp-port)
systemctl is-active --quiet accel-ppp 2>/dev/null && ok "accel-ppp actif (port ${SSTP_PORT})" || fail "accel-ppp inactif — install-accel-ppp.sh"
ss -tln 2>/dev/null | grep -q ":${SSTP_PORT} " && ok "Port ${SSTP_PORT}/tcp SSTP" || fail "Port ${SSTP_PORT}/tcp fermé"

echo ""
echo "-- Provisionnement (sudo nanotech) --"
if [[ -x "${INSTALL_DIR}/scripts/provision-wireguard.sh" ]]; then
  ok "Scripts dans ${INSTALL_DIR}"
else
  fail "Scripts manquants — setup-vpn-server.sh ou repair-vpn.sh"
fi
if sudo -u nanotech sudo -n true 2>/dev/null; then
  ok "sudo NOPASSWD pour nanotech"
else
  fail "nanotech ne peut pas sudo les scripts VPN — /etc/sudoers.d/nanotech-vpn"
fi

echo ""
if [[ "$ERRORS" -eq 0 ]]; then
  echo "=== Résultat : PRÊT (0 erreur) ==="
  echo "Sur le site : Synchroniser VPN → Provisionner → Installer sur le MikroTik."
  exit 0
else
  echo "=== Résultat : ${ERRORS} problème(s) à corriger ==="
  exit 1
fi
