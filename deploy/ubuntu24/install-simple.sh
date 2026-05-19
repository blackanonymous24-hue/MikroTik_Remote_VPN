#!/bin/bash
# Installation complète en une commande — Ubuntu 24.04 (VPS dédié)
# Usage : DOMAIN=... ADMIN_EMAIL=... ADMIN_PASS=... sudo -E bash deploy/ubuntu24/install-simple.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="${APP_DIR:-/var/www/nanotech-vpn}"
CREDENTIALS_FILE="/root/nanotech-vpn-credentials.txt"

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "ERREUR: lancez en root : sudo bash deploy/ubuntu24/install-simple.sh"
  exit 1
fi

cd "$REPO_ROOT"

echo ""
echo "=============================================="
echo "  nanoTECH VPN — installation simple"
echo "=============================================="
echo ""
echo "Prérequis :"
echo "  • Ubuntu 24.04 sur le VPS"
echo "  • Le domaine pointe déjà vers l'IP du VPS (DNS A @, www, vpn)"
echo ""

# --- Variables (arguments ou questions) ---
DOMAIN="${DOMAIN:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASS="${ADMIN_PASS:-}"
INSTALL_HTTPS="${INSTALL_HTTPS:-}"

if [[ -z "$DOMAIN" ]]; then
  read -r -p "Domaine du site (ex: nanotechvpn.com) : " DOMAIN
fi
if [[ -z "$ADMIN_EMAIL" ]]; then
  read -r -p "Email admin (connexion au site) : " ADMIN_EMAIL
fi
if [[ -z "$ADMIN_PASS" ]]; then
  read -r -s -p "Mot de passe admin : " ADMIN_PASS
  echo ""
fi

if [[ -z "$DOMAIN" || -z "$ADMIN_EMAIL" || -z "$ADMIN_PASS" ]]; then
  echo "ERREUR: domaine, email et mot de passe admin sont obligatoires."
  exit 1
fi

if [[ ${#ADMIN_PASS} -lt 8 ]]; then
  echo "ERREUR: mot de passe admin trop court (8 caractères minimum)."
  exit 1
fi

VPN_HOST="vpn.${DOMAIN}"

# --- Secrets auto-générés ---
DB_PASS="${DB_PASS:-$(openssl rand -base64 18 | tr -d '/+=' | head -c 24)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}"
L2TP_IPSEC_SECRET="${L2TP_IPSEC_SECRET:-$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)}"

echo ""
echo "==> 1/4 Base de données PostgreSQL"
export DB_PASS
bash "$REPO_ROOT/deploy/ubuntu24/setup-postgres.sh"
sudo -u postgres psql -c "ALTER USER nanotech WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true

echo ""
echo "==> 2/4 Serveur VPN (WireGuard + L2TP)"
bash "$REPO_ROOT/deploy/ubuntu24/setup-vpn-server.sh"

echo ""
echo "==> 3/4 Fichier de configuration (.env)"
mkdir -p "$APP_DIR"
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3000

DATABASE_URL="postgresql://nanotech:${DB_PASS}@localhost:5432/mikrotik_vpn?schema=public"
JWT_SECRET="${JWT_SECRET}"

NEXT_PUBLIC_APP_DOMAIN="${DOMAIN}"
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NEXT_PUBLIC_VPN_HOST="${VPN_HOST}"
NEXT_PUBLIC_VPN_WG_ENDPOINT="${VPN_HOST}:51820"

PROVISION_MODE=local
VPN_PROVISION_PATH=/opt/nanotech-vpn

L2TP_IPSEC_SECRET="${L2TP_IPSEC_SECRET}"

WG_SERVER_PUB=""
if [[ -f /var/lib/nanotech-vpn/wg-server-public.key ]]; then
  WG_SERVER_PUB=$(cat /var/lib/nanotech-vpn/wg-server-public.key)
fi
WG_SERVER_PUBLIC_KEY=${WG_SERVER_PUB}
NEXT_PUBLIC_WG_SERVER_PUBLIC_KEY=${WG_SERVER_PUB}

SEED_ADMIN_EMAIL=${ADMIN_EMAIL}
SEED_ADMIN_PASSWORD=${ADMIN_PASS}
SEED_DEMO_DEVICES=0
EOF
if ! id nanotech &>/dev/null; then
  if getent group nanotech &>/dev/null; then
    useradd -r -m -s /bin/bash -g nanotech nanotech
  else
    useradd -r -m -s /bin/bash nanotech
  fi
fi
chown -R nanotech:nanotech "$APP_DIR"
chmod 600 "$APP_DIR/.env"

echo ""
echo "==> 4/4 Application web (build + PM2 + Nginx)"
export DOMAIN
export RUN_SEED=1
bash "$REPO_ROOT/deploy/ubuntu24/setup-app.sh"

# --- Sauvegarde des identifiants ---
cat > "$CREDENTIALS_FILE" <<EOF
nanoTECH VPN — $(date -Iseconds)
================================

Site web      : https://${DOMAIN}/login
Email admin   : ${ADMIN_EMAIL}
Mot de passe  : (celui que vous avez saisi)

Secret L2TP   : ${L2TP_IPSEC_SECRET}
  → À configurer sur chaque MikroTik (IPsec), identique pour tous.

Serveur VPN   : ${VPN_HOST}
WireGuard     : ${VPN_HOST}:51820

Fichier .env  : ${APP_DIR}/.env
EOF
chmod 600 "$CREDENTIALS_FILE"

echo ""
echo "=============================================="
echo "  Installation terminée"
echo "=============================================="
echo ""
echo "  Connexion : http://${DOMAIN}/login"
echo "  (HTTPS ci-dessous si vous l'activez)"
echo ""
echo "  Identifiants sauvegardés dans :"
echo "    ${CREDENTIALS_FILE}"
echo "    cat ${CREDENTIALS_FILE}"
echo ""

# --- HTTPS optionnel ---
if [[ -z "$INSTALL_HTTPS" ]]; then
  read -r -p "Installer le certificat HTTPS maintenant ? (o/N) : " INSTALL_HTTPS
fi

if [[ "${INSTALL_HTTPS,,}" == "o" || "${INSTALL_HTTPS,,}" == "oui" || "${INSTALL_HTTPS,,}" == "y" || "${INSTALL_HTTPS}" == "1" ]]; then
  echo ""
  echo "==> Certificat HTTPS (Let's Encrypt)"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    -m "${ADMIN_EMAIL}" \
    || echo "ATTENTION: certbot a échoué — vérifiez le DNS puis relancez :"
  echo "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi

echo ""
echo "==> Test santé"
sleep 2
curl -sf "http://127.0.0.1:3000/api/health" && echo "" || echo "Health check : attendez 10s puis curl http://127.0.0.1:3000/api/health"
echo ""
echo "Terminé."
