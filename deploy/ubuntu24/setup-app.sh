#!/bin/bash
# Déploiement application Next.js — Ubuntu 24.04 (VPS dédié)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nanotech-vpn}"
APP_USER="${APP_USER:-nanotech}"
DOMAIN="${DOMAIN:-nanotechvpn.com}"
RUN_SEED="${RUN_SEED:-0}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> Node.js 20"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs wireguard-tools
fi

echo "==> Utilisateur application"
if ! id "$APP_USER" &>/dev/null; then
  if getent group "$APP_USER" &>/dev/null; then
    useradd -r -m -s /bin/bash -g "$APP_USER" "$APP_USER"
  else
    useradd -r -m -s /bin/bash "$APP_USER"
  fi
fi
usermod -aG nanotech "$APP_USER" 2>/dev/null || true

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
  echo "  cp deploy/env.production.example ${APP_DIR}/.env"
  echo "  Éditez DATABASE_URL, JWT_SECRET, PROVISION_MODE=local, L2TP_IPSEC_SECRET"
  exit 1
fi

chown "$APP_USER:$APP_USER" .env
chmod 600 .env

echo "==> Build"
sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npx prisma generate
sudo -u "$APP_USER" npx prisma db push

if [[ "$RUN_SEED" == "1" ]]; then
  sudo -u "$APP_USER" npm run db:seed
else
  echo "Seed ignoré (RUN_SEED=1 pour admin initial — voir SEED_ADMIN_* dans .env)"
fi

sudo -u "$APP_USER" npm run build

echo "==> PM2"
npm install -g pm2
sudo -u "$APP_USER" pm2 delete nanotech-vpn 2>/dev/null || true
sudo -u "$APP_USER" pm2 start ecosystem.config.cjs
sudo -u "$APP_USER" pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER"

echo "==> Nginx"
apt-get install -y nginx
cp deploy/nginx/nanotechvpn.conf /etc/nginx/sites-available/nanotechvpn
sed -i "s/nanotechvpn.com/${DOMAIN}/g" /etc/nginx/sites-available/nanotechvpn
sed -i "s/www.nanotechvpn.com/www.${DOMAIN}/g" /etc/nginx/sites-available/nanotechvpn
ln -sf /etc/nginx/sites-available/nanotechvpn /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo ""
echo "=== Application déployée ==="
echo "  https://${DOMAIN} (après certbot)"
echo "  sudo bash deploy/ubuntu24/setup-vpn-server.sh  # si pas encore fait"
echo "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
