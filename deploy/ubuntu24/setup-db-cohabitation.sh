#!/bin/bash
# Base PostgreSQL dédiée — VPS déjà utilisé par nanovoucher.com
# N'installe PAS PostgreSQL, crée uniquement user + base isolés
set -euo pipefail

DB_NAME="${DB_NAME:-mikrotik_vpn}"
DB_USER="${DB_USER:-mikrotik_vpn_app}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 24)}"

if ! command -v psql &>/dev/null; then
  echo "ERREUR: PostgreSQL non installé. Installez-le d'abord (souvent déjà fait pour nanovoucher)."
  exit 1
fi

echo "==> Création rôle ${DB_USER} (si absent)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

echo "==> Création base ${DB_NAME} (si absente)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

echo ""
echo "=== Base VPN prête (séparée de nanovoucher) ==="
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
echo ""
echo "Ajoutez cette ligne dans /var/www/nanotech-vpn/.env"
