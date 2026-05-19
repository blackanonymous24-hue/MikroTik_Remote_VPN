#!/bin/bash
# Efface l'installation précédente pour repartir avec install-simple.sh
# Usage : sudo bash deploy/ubuntu24/reset-install.sh
set -euo pipefail

echo "==> Arrêt application"
pm2 delete nanotech-vpn 2>/dev/null || true

echo "==> Suppression fichiers application"
rm -rf /var/www/nanotech-vpn

echo "==> Suppression identifiants sauvegardés"
rm -f /root/nanotech-vpn-credentials.txt

echo "==> Réinitialisation base de données (données effacées)"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS mikrotik_vpn;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE mikrotik_vpn OWNER nanotech;" 2>/dev/null || true

echo "==> Nettoyage comptes VPN provisionnés (optionnel)"
rm -f /var/lib/nanotech-vpn/*.conf 2>/dev/null || true

echo ""
echo "=== Reset terminé ==="
echo "Relancez l'installation :"
echo "  cd /root/MikroTik_Remote_VPN"
echo "  sudo bash deploy/ubuntu24/install-simple.sh"
