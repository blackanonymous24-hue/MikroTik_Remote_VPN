# Cohabitation VPS — nanovoucher.com + nanoTECH VPN

Installer **nanoTECH VPN** sur le VPS qui héberge déjà **nanovoucher.com**, sans conflit.

## Architecture sur 1 VPS

| Service | Domaine | Port interne | Base PostgreSQL |
|---------|---------|--------------|-----------------|
| nanovoucher (existant) | `nanovoucher.com` | `3000` ou `3001` | base existante |
| **nanoTECH VPN** | `nanotechvpn.com` | **`3002`** | **`mikrotik_vpn`** |
| Serveur VPN | `vpn.nanotechvpn.com` | UDP/TCP VPN | — |

WireGuard : réseau **`10.200.100.0/24`** (évite conflit LAN `10.10.0.x`).

## Checklist avant installation

- [ ] DNS `nanotechvpn.com`, `www`, `vpn` → IP du VPS
- [ ] nanovoucher fonctionne (ne pas modifier son vhost Nginx)
- [ ] Port **3002** libre : `ss -tlnp | grep 3002`
- [ ] PostgreSQL déjà installé (via nanovoucher)
- [ ] PM2 déjà utilisé ? OK — on ajoute un processus `nanotech-vpn`
- [ ] Sauvegarde VPS / snapshot recommandé

## Installation (ordre)

### 1. Base de données dédiée

```bash
cd /chemin/vers/MikroTik_Remote_VPN
sudo bash deploy/ubuntu24/setup-db-cohabitation.sh
```

Copiez la `DATABASE_URL` affichée.

### 2. Fichier `.env` production

```bash
sudo mkdir -p /var/www/nanotech-vpn
sudo cp deploy/env.production.cohabitation.example /var/www/nanotech-vpn/.env
sudo nano /var/www/nanotech-vpn/.env
```

Renseignez au minimum :
- `DATABASE_URL` (étape 1)
- `JWT_SECRET` (long, aléatoire)
- `PROVISION_MODE=local` si VPN sur le même VPS

### 3. Services VPN (une seule fois)

```bash
sudo bash deploy/ubuntu24/setup-vpn-server.sh
```

Installe WireGuard + scripts dans `/opt/nanotech-vpn/scripts/`.

### 4. Application (port 3002)

```bash
sudo bash deploy/ubuntu24/setup-cohabitation.sh
# Seed démo optionnel :
# sudo RUN_SEED=1 bash deploy/ubuntu24/setup-cohabitation.sh
```

### 5. HTTPS

```bash
sudo certbot --nginx -d nanotechvpn.com -d www.nanotechvpn.com
```

Ne relancez **pas** un certbot global qui modifierait nanovoucher sans vérification.

## Vérifications

```bash
# Processus
pm2 status

# App locale
curl -I http://127.0.0.1:3002

# Nginx
sudo nginx -t
curl -I -H "Host: nanotechvpn.com" http://127.0.0.1

# Base isolée
sudo -u postgres psql -l | grep mikrotik_vpn
```

Connexion : `https://nanotechvpn.com` — super admin **HS** / **root** (après seed).

## Ce qu'on ne touche PAS

- Vhost / certificat **nanovoucher.com**
- Base PostgreSQL de nanovoucher
- Port utilisé par nanovoucher (3000, 3001, etc.)

## Mise à jour de l'app VPN

```bash
cd /var/www/nanotech-vpn
git pull   # ou rsync depuis votre machine
npm ci && npx prisma db push && npm run build
pm2 restart nanotech-vpn
```

## Dépannage

| Problème | Action |
|----------|--------|
| 502 Bad Gateway | `pm2 logs nanotech-vpn` — app sur 3002 ? |
| Port occupé | `APP_PORT=3003` dans setup + `.env` + nginx |
| Conflit DB | Vérifier que `DATABASE_URL` pointe vers `mikrotik_vpn`, pas la base nanovoucher |
| WireGuard | `sudo wg show` — interface `wg0` sur `10.200.100.1/24` |

## VPS dédié plus tard ?

Exportez la base `mikrotik_vpn`, déployez sur un nouveau VPS avec [DEPLOY-UBUNTU24.md](./DEPLOY-UBUNTU24.md), mettez à jour DNS `vpn.nanotechvpn.com`.
