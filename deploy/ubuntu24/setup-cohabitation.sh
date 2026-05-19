#!/bin/bash
# Déploiement cohabitation — même VPS que nanovoucher.com
# - App Next.js sur port 3002 (ne pas utiliser 3000/3001 si occupés)
# - Base PostgreSQL dédiée mikrotik_vpn
# - Nginx vhost séparé nanotechvpn.com
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nanotech-vpn}"
APP_PORT="${APP_PORT:-3002}"
DOMAIN="${DOMAIN:-nanotechvpn.com}"
APP_USER="${APP_USER:-$USER}"
RUN_SEED="${RUN_SEED:-0}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=========================================="
echo " nanoTECH VPN — mode cohabitation VPS"
echo " Port: ${APP_PORT} | Domaine: ${DOMAIN}"
echo "=========================================="

if ss -tln | grep -q ":${APP_PORT} "; then
  echo "ATTENTION: le port ${APP_PORT} est déjà utilisé."
  echo "Vérifiez: ss -tlnp | grep ${APP_PORT}"
  echo "Changez APP_PORT si nanovoucher ou autre service l'utilise."
  read -r -p "Continuer quand même ? [y/N] " ans
  [[ "${ans,,}" == "y" ]] || exit 1
fi

echo "==> Vérification Node.js"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==> Déploiement code → ${APP_DIR}"
mkdir -p "$APP_DIR"
rsync -a \
  --exclude node_modules \
  --exclude .next \
  --exclude .env \
  --exclude .git \
  "$REPO_ROOT/" "$APP_DIR/"

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "ERREUR: créez ${APP_DIR}/.env avant de continuer."
  echo "  1. sudo bash deploy/ubuntu24/setup-db-cohabitation.sh"
  echo "  2. cp deploy/env.production.cohabitation.example ${APP_DIR}/.env"
  echo "  3. éditez .env (DATABASE_URL, JWT_SECRET)"
  exit 1
fi

echo "==> Build application (port ${APP_PORT})"
export PORT="${APP_PORT}"
npm ci
npx prisma generate
npx prisma db push

if [[ "$RUN_SEED" == "1" ]]; then
  npm run db:seed
else
  echo "Seed ignoré (RUN_SEED=1 pour exécuter le seed démo)"
fi

npm run build

echo "==> PM2 (processus nanotech-vpn)"
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

pm2 delete nanotech-vpn 2>/dev/null || true
PORT="${APP_PORT}" pm2 start ecosystem.config.cohabitation.cjs
pm2 save

echo "==> Nginx (vhost ${DOMAIN} uniquement)"
if ! command -v nginx &>/dev/null; then
  apt-get update && apt-get install -y nginx
fi

cp deploy/nginx/nanotechvpn-cohabitation.conf /etc/nginx/sites-available/nanotechvpn
sed -i "s/nanotechvpn.com/${DOMAIN}/g" /etc/nginx/sites-available/nanotechvpn
sed -i "s/www.nanotechvpn.com/www.${DOMAIN}/g" /etc/nginx/sites-available/nanotechvpn
ln -sf /etc/nginx/sites-available/nanotechvpn /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo ""
echo "=== Cohabitation installée ==="
echo "  App interne : http://127.0.0.1:${APP_PORT}"
echo "  Public      : https://${DOMAIN} (après certbot)"
echo "  PM2         : pm2 status | pm2 logs nanotech-vpn"
echo ""
echo "Prochaines étapes :"
echo "  sudo bash deploy/ubuntu24/setup-vpn-server.sh   # si VPN pas encore installé"
echo "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "  Voir docs/DEPLOY-COHABITATION.md"
