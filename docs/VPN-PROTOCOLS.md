# Protocoles VPN — nanoTECH

| Protocole | Service VPS | Port | MikroTik |
|-----------|-------------|------|----------|
| L2TP + IPsec | xl2tpd + strongswan | 1701/udp, 500/4500 | `l2tp-nanotech` |
| WireGuard | wg0 | 51820/udp | `wg-nanotech` |
| SSTP | accel-ppp | 443/tcp ou **4443** si nginx utilise 443 | `sstp-nanotech` |
| OpenVPN | openvpn-server@nanotech | 1194/udp | `ovpn-nanotech` |

## Mise à jour VPS existant

```bash
cd /root/MikroTik_Remote_VPN && git pull
sudo bash deploy/ubuntu24/setup-vpn-server.sh
# Si SSTP ne démarre pas :
sudo bash deploy/ubuntu24/install-accel-ppp.sh
sudo systemctl restart accel-ppp openvpn-server@nanotech
```

Copier le port SSTP affiché dans `.env` :

```bash
cat /var/lib/nanotech-vpn/sstp-port   # ex. 4443
# NEXT_PUBLIC_SSTP_PORT=4443
```

Puis **Provisionner** ou **Synchroniser** chaque routeur SSTP/OVPN.

## Port 443 et nginx

Si `nanotechvpn.com` ou `vpn.nanotechvpn.com` utilise déjà le port 443 (HTTPS), SSTP est installé sur **4443** par défaut. Le script MikroTik inclut `port=4443` via `NEXT_PUBLIC_SSTP_PORT`.

Pour SSTP sur 443 : certificat dédié + `stream` nginx vers accel-ppp, ou IP publique séparée.

## Certificats

- **SSTP** : certificat auto-signé dans `/etc/nanotech-vpn/sstp/` — le MikroTik utilise `verify-server-certificate=no`.
- **OpenVPN** : PKI dans `/etc/openvpn/nanotech/` — idem côté MikroTik.

Pour la production, remplacez par Let’s Encrypt sur `vpn.nanotechvpn.com`.
