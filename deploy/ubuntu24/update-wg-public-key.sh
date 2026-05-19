#!/bin/bash
# Écrit la clé publique WireGuard du serveur dans .env et le fichier data
set -euo pipefail

APP_ENV="${APP_ENV:-/var/www/nanotech-vpn/.env}"
KEY_FILE="/var/lib/nanotech-vpn/wg-server-public.key"

if ! command -v wg &>/dev/null; then
  echo "ERREUR: wireguard-tools non installé"
  exit 1
fi

PUB=$(wg show wg0 public-key 2>/dev/null | tr -d '\n')
if [[ -z "$PUB" ]]; then
  echo "ERREUR: interface wg0 introuvable ou inactive"
  exit 1
fi

mkdir -p /var/lib/nanotech-vpn
echo "$PUB" > "$KEY_FILE"

if [[ -f "$APP_ENV" ]]; then
  if grep -q '^WG_SERVER_PUBLIC_KEY=' "$APP_ENV"; then
    sed -i "s|^WG_SERVER_PUBLIC_KEY=.*|WG_SERVER_PUBLIC_KEY=${PUB}|" "$APP_ENV"
  else
    echo "WG_SERVER_PUBLIC_KEY=${PUB}" >> "$APP_ENV"
  fi
  if grep -q '^NEXT_PUBLIC_WG_SERVER_PUBLIC_KEY=' "$APP_ENV"; then
    sed -i "s|^NEXT_PUBLIC_WG_SERVER_PUBLIC_KEY=.*|NEXT_PUBLIC_WG_SERVER_PUBLIC_KEY=${PUB}|" "$APP_ENV"
  else
    echo "NEXT_PUBLIC_WG_SERVER_PUBLIC_KEY=${PUB}" >> "$APP_ENV"
  fi
fi

echo "Clé publique serveur : $PUB"
echo "Redémarrez l'app : sudo -u nanotech pm2 restart nanotech-vpn"
echo "Puis Settings → Synchroniser tous les VPN"
