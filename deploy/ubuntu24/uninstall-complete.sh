#!/bin/bash
# Désinstallation TOTALE nanoTECH VPN — aucune trace résiduelle (VPS dédié)
#
# Usage :
#   sudo bash deploy/ubuntu24/uninstall-complete.sh
#   sudo UNINSTALL_YES=1 bash deploy/ubuntu24/uninstall-complete.sh   # sans confirmation
#
# Options (variables d'environnement) :
#   KEEP_REPO=1          — ne pas supprimer le clone git (ex. /root/MikroTik_Remote_VPN)
#   KEEP_NGINX=1         — garder le vhost nginx (rare)
#   KEEP_SYSTEM_USER=1   — ne pas supprimer l'utilisateur Linux « nanotech »
#   DOMAIN=nanotechvpn.com
#
set -uo pipefail

DOMAIN="${DOMAIN:-nanotechvpn.com}"
APP_DIR="${APP_DIR:-/var/www/nanotech-vpn}"
INSTALL_DIR="${INSTALL_DIR:-/opt/nanotech-vpn}"
DATA_DIR="${DATA_DIR:-/var/lib/nanotech-vpn}"
REPO_DIR="${REPO_DIR:-/root/MikroTik_Remote_VPN}"
DB_NAME="${DB_NAME:-mikrotik_vpn}"
DB_USER="${DB_USER:-nanotech}"
CREDENTIALS_FILE="/root/nanotech-vpn-credentials.txt"

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "ERREUR: exécutez en root : sudo bash deploy/ubuntu24/uninstall-complete.sh"
  exit 1
fi

echo ""
echo "=============================================="
echo "  DÉSINSTALLATION COMPLÈTE — nanoTECH VPN"
echo "=============================================="
echo ""
echo "Seront supprimés :"
echo "  • Application PM2 (nanotech-vpn)"
echo "  • ${APP_DIR}"
echo "  • ${INSTALL_DIR} et ${DATA_DIR}"
echo "  • Nginx vhost ${DOMAIN}"
echo "  • Base PostgreSQL ${DB_NAME} (utilisateur ${DB_USER} si dédié)"
echo "  • Services VPN : WireGuard wg0, OpenVPN@nanotech, accel-ppp, configs L2TP nanoTECH"
echo "  • /etc/nanotech-vpn, sudoers, certificats Let's Encrypt (si présents)"
echo "  • Clone git ${REPO_DIR} (sauf KEEP_REPO=1)"
echo ""

if [[ "${UNINSTALL_YES:-}" != "1" ]]; then
  read -r -p "Tapez SUPPRIMER pour continuer : " CONFIRM
  if [[ "$CONFIRM" != "SUPPRIMER" ]]; then
    echo "Annulé."
    exit 0
  fi
fi

log() { echo "==> $*"; }

# --- PM2 (root + utilisateur nanotech) ---
log "Arrêt PM2"
pm2 delete nanotech-vpn 2>/dev/null || true
pm2 save 2>/dev/null || true

if id nanotech &>/dev/null; then
  sudo -u nanotech pm2 delete nanotech-vpn 2>/dev/null || true
  sudo -u nanotech pm2 delete all 2>/dev/null || true
  sudo -u nanotech pm2 save 2>/dev/null || true
  if [[ -d /home/nanotech ]]; then
    rm -rf /home/nanotech/.pm2 2>/dev/null || true
  fi
fi

# Désactiver démarrage auto PM2 nanotech
if command -v pm2 &>/dev/null && id nanotech &>/dev/null; then
  env PATH="$PATH" pm2 unstartup systemd -u nanotech --hp /home/nanotech 2>/dev/null || true
fi

# --- Application ---
log "Suppression application"
rm -rf "$APP_DIR"
rm -f "$CREDENTIALS_FILE"
rm -f /root/.nanotech-vpn-uninstall-backup-* 2>/dev/null || true

# --- Nettoyage iptables DNAT (avant suppression DATA_DIR) ---
if [[ -f "${DATA_DIR}/port-forwards.conf" ]]; then
  log "Nettoyage règles iptables DNAT"
  while IFS='|' read -r _ winbox webfig api router_ip; do
    [[ -z "$router_ip" ]] && continue
    for pair in "${winbox}:8291" "${webfig}:80" "${api}:8728"; do
      dport="${pair%%:*}"
      toport="${pair##*:}"
      iptables -t nat -D PREROUTING -p tcp --dport "$dport" -j DNAT --to-destination "${router_ip}:${toport}" 2>/dev/null || true
    done
  done < "${DATA_DIR}/port-forwards.conf" 2>/dev/null || true
fi

# --- Scripts et données VPN ---
log "Suppression scripts provisionnement"
rm -rf "$INSTALL_DIR"
rm -rf "$DATA_DIR"
rm -rf /etc/nanotech-vpn
rm -f /etc/sudoers.d/nanotech-vpn

# --- OpenVPN nanoTECH ---
log "Arrêt OpenVPN nanoTECH"
systemctl stop openvpn-server@nanotech 2>/dev/null || true
systemctl stop openvpn@nanotech 2>/dev/null || true
systemctl disable openvpn-server@nanotech 2>/dev/null || true
systemctl disable openvpn@nanotech 2>/dev/null || true
rm -f /etc/openvpn/nanotech.conf
rm -rf /etc/openvpn/nanotech
rm -f /var/log/openvpn/nanotech.log /var/log/openvpn/nanotech-status.log 2>/dev/null || true

# --- SSTP accel-ppp ---
log "Arrêt SSTP (accel-ppp)"
systemctl stop accel-ppp 2>/dev/null || true
systemctl disable accel-ppp 2>/dev/null || true
rm -f /etc/accel-ppp.conf
rm -rf /var/log/accel-ppp

# --- WireGuard wg0 (créé par install nanoTECH) ---
log "Arrêt WireGuard wg0"
systemctl stop wg-quick@wg0 2>/dev/null || true
systemctl disable wg-quick@wg0 2>/dev/null || true
ip link delete wg0 2>/dev/null || true
rm -f /etc/wireguard/wg0.conf

# --- Bloc L2TP dans chap-secrets ---
if [[ -f /etc/ppp/chap-secrets ]]; then
  log "Nettoyage chap-secrets L2TP nanoTECH"
  sed -i '/# --- nanoTECH L2TP users (auto) ---/,/# --- end nanoTECH L2TP ---/d' /etc/ppp/chap-secrets 2>/dev/null || true
fi

# --- Nginx ---
if [[ "${KEEP_NGINX:-}" != "1" ]]; then
  log "Suppression vhost Nginx"
  rm -f /etc/nginx/sites-enabled/nanotechvpn
  rm -f /etc/nginx/sites-available/nanotechvpn
  if command -v nginx &>/dev/null; then
    nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
  fi
fi

# --- Certificats Let's Encrypt ---
if command -v certbot &>/dev/null; then
  log "Suppression certificats certbot (si existants)"
  certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
  certbot delete --cert-name "www.${DOMAIN}" --non-interactive 2>/dev/null || true
fi

# --- PostgreSQL ---
log "Suppression base PostgreSQL ${DB_NAME}"
if command -v psql &>/dev/null; then
  sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}';" 2>/dev/null || true
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
  if [[ "${KEEP_SYSTEM_USER:-}" != "1" ]]; then
  sudo -u postgres psql -c "DROP USER IF EXISTS ${DB_USER};" 2>/dev/null || true
  fi
fi

# --- Utilisateur système ---
if [[ "${KEEP_SYSTEM_USER:-}" != "1" ]]; then
  log "Suppression utilisateur Linux nanotech"
  userdel -r nanotech 2>/dev/null || userdel nanotech 2>/dev/null || true
  groupdel nanotech 2>/dev/null || true
fi

# --- Clone dépôt ---
if [[ "${KEEP_REPO:-}" != "1" && -d "$REPO_DIR" ]]; then
  log "Suppression dépôt ${REPO_DIR}"
  rm -rf "$REPO_DIR"
fi

# --- Vérification résidus ---
log "Vérification résidus"
RESIDUAL=0
check_residual() {
  if [[ -e "$1" ]]; then
    echo "  [RESTE] $1"
    RESIDUAL=$((RESIDUAL + 1))
  fi
}

check_residual "$APP_DIR"
check_residual "$INSTALL_DIR"
check_residual "$DATA_DIR"
check_residual "/etc/nanotech-vpn"
check_residual "/etc/sudoers.d/nanotech-vpn"
check_residual "/etc/nginx/sites-enabled/nanotechvpn"
check_residual "/etc/openvpn/nanotech.conf"
check_residual "/etc/wireguard/wg0.conf"
check_residual "$CREDENTIALS_FILE"

if pgrep -af "next start" 2>/dev/null | grep -q nanotech; then
  echo "  [RESTE] processus next/node lié à nanotech"
  RESIDUAL=$((RESIDUAL + 1))
fi

echo ""
if [[ "$RESIDUAL" -eq 0 ]]; then
  echo "=== Désinstallation terminée — aucun fichier standard détecté ==="
else
  echo "=== Terminé avec ${RESIDUAL} élément(s) à vérifier manuellement ==="
fi
echo ""
echo "Le VPS peut encore avoir :"
echo "  • Paquets apt (nodejs, postgresql, wireguard…) — désinstallez avec apt si besoin"
echo "  • Règles UFW (51820, 1701…) — ufw status puis ufw delete allow …"
echo "  • Autres sites (nanovoucher, etc.) — non touchés par ce script"
echo ""
