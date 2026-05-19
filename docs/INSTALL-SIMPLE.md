# Installation simple (débutant)

**Une seule commande** installe tout : base de données, VPN, site web, compte admin.

## Avant de commencer

1. VPS **Ubuntu 24.04** (root ou sudo).
2. Domaine acheté (ex. `nanotechvpn.com`).
3. DNS configuré chez votre registrar (enregistrements **A** vers l’IP du VPS) :

| Nom | Type | Valeur |
|-----|------|--------|
| `@` | A | IP du VPS |
| `www` | A | IP du VPS |
| `vpn` | A | IP du VPS |

Attendre 15–60 min que le DNS se propage.

## 1. Se connecter au VPS

```bash
ssh root@VOTRE_IP
```

## 2. Récupérer le projet

```bash
cd /root
git clone https://github.com/blackanonymous24-hue/MikroTik_Remote_VPN.git
cd MikroTik_Remote_VPN
```

*(Dépôt privé : utilisez un token GitHub ou une clé SSH.)*

## 3. Lancer l’installation

```bash
sudo bash deploy/ubuntu24/install-simple.sh
```

Le script demande **3 choses** :
- le domaine (`nanotechvpn.com`)
- l’email admin
- le mot de passe admin

Tout le reste est **généré automatiquement**.

À la fin, choisissez **o** pour installer HTTPS (recommandé).

## 4. Se connecter au site

Ouvrez : `https://votredomaine.com/login`

Les identifiants sont aussi dans :

```bash
cat /root/nanotech-vpn-credentials.txt
```

*(Contient le secret L2TP pour les MikroTik.)*

## Tout effacer et recommencer

Si vous avez commencé avec `nano` ou une install incomplète :

```bash
cd /root/MikroTik_Remote_VPN
git pull
sudo bash deploy/ubuntu24/reset-install.sh
sudo bash deploy/ubuntu24/install-simple.sh
```

## Réinstaller / mise à jour

```bash
cd /root/MikroTik_Remote_VPN
git pull
sudo bash deploy/ubuntu24/install-simple.sh
```

## Installation sans questions (avancé)

```bash
export DOMAIN=nanotechvpn.com
export ADMIN_EMAIL=admin@nanotechvpn.com
export ADMIN_PASS="VotreMotDePasse"
export INSTALL_HTTPS=1
sudo -E bash deploy/ubuntu24/install-simple.sh
```

Utilisez **`sudo -E`** pour que le script reçoive bien email et mot de passe.

## VPS déjà utilisé par nanovoucher ?

Utilisez [DEPLOY-COHABITATION.md](./DEPLOY-COHABITATION.md) (pas ce script).

## En cas d’erreur

```bash
pm2 logs nanotech-vpn
curl http://127.0.0.1:3000/api/health
```
