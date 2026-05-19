# Déploiement Ubuntu 24.04

Domaine acheté : **nanotechvpn.com**

| Sous-domaine | Rôle |
|--------------|------|
| `nanotechvpn.com` | Plateforme SaaS (Nginx → Next.js :3000) |
| `vpn.nanotechvpn.com` | Serveur VPN (WireGuard, L2TP, DNAT ports) |

Les deux pointent vers la **même IP VPS** au départ.

**Réseau WireGuard** : `10.200.100.0/24` (serveur `.1`, routeurs `.12+`) — choisi pour éviter les LAN clients en `10.10.x` ou `192.168.x`.

## DNS

```
@    A    IP_VPS
www  A    IP_VPS
vpn  A    IP_VPS
```

## `.env` production

Copiez le modèle complet :

```bash
cp deploy/env.production.example /var/www/nanotech-vpn/.env
```

Variables obligatoires :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | PostgreSQL local |
| `JWT_SECRET` | ≥ 32 caractères (`openssl rand -base64 32`) |
| `PROVISION_MODE` | `local` (app + VPN même VPS) |
| `VPN_PROVISION_PATH` | `/opt/nanotech-vpn` |
| `L2TP_IPSEC_SECRET` | Secret IPsec L2TP (identique côté MikroTik) |

`PROVISION_MODE=mock` est **interdit** en production (validation au démarrage).

## Installation simple (recommandé)

Voir **[INSTALL-SIMPLE.md](./INSTALL-SIMPLE.md)** — une commande :

```bash
sudo bash deploy/ubuntu24/install-simple.sh
```

## Installation manuelle (étape par étape)

```bash
# 1. Base de données
sudo bash deploy/ubuntu24/setup-postgres.sh

# 2. Services VPN + scripts (/opt/nanotech-vpn/scripts)
sudo bash deploy/ubuntu24/setup-vpn-server.sh

# 3. Créer .env sur le VPS (voir ci-dessus), puis application
export DOMAIN=nanotechvpn.com
export RUN_SEED=1   # une seule fois, avec SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
sudo bash deploy/ubuntu24/setup-app.sh

# 4. HTTPS
sudo certbot --nginx -d nanotechvpn.com -d www.nanotechvpn.com

# 5. Vérification
curl -s http://127.0.0.1:3000/api/health
```

L’utilisateur système `nanotech` doit être dans le groupe `nanotech` (sudo NOPASSWD sur les scripts VPN).

Optionnel : certificat pour `vpn.nanotechvpn.com` si services TLS sur ce host.

> **VPS déjà utilisé par nanovoucher.com ?** Utilisez [DEPLOY-COHABITATION.md](./DEPLOY-COHABITATION.md) (port 3002, base séparée).
