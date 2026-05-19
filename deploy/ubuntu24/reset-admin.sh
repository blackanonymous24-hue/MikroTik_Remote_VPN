#!/bin/bash
# Réinitialise le super admin (mot de passe oublié / identifiants incorrects)
# Usage : sudo bash deploy/ubuntu24/reset-admin.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nanotech-vpn}"
ENV_FILE="${APP_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERREUR: $ENV_FILE introuvable"
  exit 1
fi

read -r -p "Email admin : " ADMIN_EMAIL
read -r -s -p "Nouveau mot de passe admin : " ADMIN_PASS
echo ""

if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASS" ]]; then
  echo "ERREUR: email et mot de passe obligatoires"
  exit 1
fi

# Mettre à jour .env pour les prochains seeds
if grep -q '^SEED_ADMIN_EMAIL=' "$ENV_FILE"; then
  sed -i "s|^SEED_ADMIN_EMAIL=.*|SEED_ADMIN_EMAIL=${ADMIN_EMAIL}|" "$ENV_FILE"
else
  echo "SEED_ADMIN_EMAIL=${ADMIN_EMAIL}" >> "$ENV_FILE"
fi

if grep -q '^SEED_ADMIN_PASSWORD=' "$ENV_FILE"; then
  sed -i "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=${ADMIN_PASS}|" "$ENV_FILE"
else
  echo "SEED_ADMIN_PASSWORD=${ADMIN_PASS}" >> "$ENV_FILE"
fi

chown nanotech:nanotech "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "==> Mise à jour base de données"
sudo -u nanotech bash -lc "cd ${APP_DIR} && set -a && source .env && set +a && npm run db:seed"

echo "==> Redémarrage application"
sudo -u nanotech pm2 restart nanotech-vpn 2>/dev/null || true

echo ""
echo "=== Admin réinitialisé ==="
echo "  URL   : https://$(grep NEXT_PUBLIC_APP_DOMAIN= "$ENV_FILE" | cut -d= -f2 | tr -d '\"')/login"
echo "  Email : ${ADMIN_EMAIL}"
echo "  Mot de passe : (celui que vous venez de saisir)"
