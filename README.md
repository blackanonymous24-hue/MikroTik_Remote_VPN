# nanoTECH MikroTik Remote VPN

Plateforme SaaS multi-tenant pour accès distant MikroTik.

## Domaines (1 achat : nanotechvpn.com)

| Usage | Domaine |
|-------|---------|
| **Plateforme SaaS** | `https://nanotechvpn.com` |
| **Serveur VPN** | `vpn.nanotechvpn.com` |

### DNS

```
@    →  A  →  IP VPS   (plateforme)
www  →  A  →  IP VPS
vpn  →  A  →  IP VPS   (WireGuard, L2TP, ports Winbox…)
```

## Exemples routeurs

| Service | Adresse |
|---------|---------|
| WireGuard endpoint | `vpn.nanotechvpn.com:51820` |
| IPv4 tunnel (routeur) | `10.200.100.12` … réseau `10.200.100.0/24` |
| Winbox | `vpn.nanotechvpn.com:62336` |
| `connect-to` (L2TP/SSTP/OVPN) | `vpn.nanotechvpn.com` |

## Démarrage local

```bash
cp .env.example .env
docker compose up -d
npm install && npx prisma db push && npm run db:seed && npm run dev
```

Super admin : **HS** / **root**

| Déploiement | Guide |
|-------------|--------|
| VPS dédié | [docs/DEPLOY-UBUNTU24.md](docs/DEPLOY-UBUNTU24.md) |
| **Même VPS que nanovoucher.com** | [docs/DEPLOY-COHABITATION.md](docs/DEPLOY-COHABITATION.md) — port **3002**, base **`mikrotik_vpn`** |
