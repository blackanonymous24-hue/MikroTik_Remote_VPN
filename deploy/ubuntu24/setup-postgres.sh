#!/bin/bash
# Installation PostgreSQL — Ubuntu 24.04
set -euo pipefail

DB_NAME="${DB_NAME:-mikrotik_vpn}"
DB_USER="${DB_USER:-nanotech}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 24)}"

echo "==> Installation PostgreSQL"
apt-get update
apt-get install -y postgresql postgresql-contrib

if sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
else
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
fi

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo ""
echo "=== PostgreSQL prêt ==="
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
echo "(Conservez ce mot de passe en lieu sûr)"
