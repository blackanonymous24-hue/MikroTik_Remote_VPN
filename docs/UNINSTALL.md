# Désinstallation complète sur le VPS

## Commande (sur le VPS, en root)

```bash
cd /root/MikroTik_Remote_VPN   # si le dépôt existe encore
sudo bash deploy/ubuntu24/uninstall-complete.sh
```

Confirmez en tapant **SUPPRIMER**.

Sans confirmation :

```bash
sudo UNINSTALL_YES=1 bash deploy/ubuntu24/uninstall-complete.sh
```

## Ce qui est supprimé

| Élément | Chemin / service |
|---------|------------------|
| Application Next.js | `/var/www/nanotech-vpn`, PM2 `nanotech-vpn` |
| Scripts VPN | `/opt/nanotech-vpn` |
| Données VPN | `/var/lib/nanotech-vpn` |
| Config SSTP | `/etc/nanotech-vpn`, `accel-ppp` |
| OpenVPN | `openvpn-server@nanotech`, `/etc/openvpn/nanotech*` |
| WireGuard | `wg0`, `/etc/wireguard/wg0.conf` |
| Nginx | vhost `nanotechvpn` |
| PostgreSQL | base `mikrotik_vpn`, user `nanotech` |
| Identifiants | `/root/nanotech-vpn-credentials.txt` |
| Dépôt git | `/root/MikroTik_Remote_VPN` |
| Certbot | certificat `nanotechvpn.com` (si présent) |

## Options

```bash
# Garder le clone git pour réinstaller plus tard
sudo KEEP_REPO=1 UNINSTALL_YES=1 bash deploy/ubuntu24/uninstall-complete.sh

# Garder l'utilisateur Linux nanotech (cohabitation)
sudo KEEP_SYSTEM_USER=1 UNINSTALL_YES=1 bash deploy/ubuntu24/uninstall-complete.sh
```

## Après désinstallation (optionnel)

Supprimer les paquets si le VPS ne sert plus à rien d'autre :

```bash
sudo apt-get remove --purge -y nodejs postgresql wireguard openvpn xl2tpd strongswan accel-ppp 2>/dev/null || true
sudo apt-get autoremove -y
```

Vérifier les ports :

```bash
sudo ufw status
sudo ss -tulpn | grep -E '3000|51820|1701|1194|443'
```
