# Dépannage — « Rien ne marche »

## Cause n°1 (corrigée) : `.env` cassé à l’installation

L’ancien `install-simple.sh` écrivait du **code bash** dans `/var/www/nanotech-vpn/.env` au lieu de la clé WireGuard. Conséquence : **WireGuard impossible**, provisionnement incohérent.

Vérifier :

```bash
grep -E '^(if |\[\[ |WG_SERVER_PUB)' /var/www/nanotech-vpn/.env
```

Si des lignes apparaissent → lancer la réparation ci-dessous.

## Réparation en une commande (VPS root)

```bash
cd /root/MikroTik_Remote_VPN && git pull
sudo bash deploy/ubuntu24/repair-vpn.sh
```

Puis sur le site : **Settings → Synchroniser tous les VPN**, puis sur chaque routeur **Provisionner** et **Installer**.

## Diagnostic seul

```bash
sudo bash deploy/ubuntu24/verify-vpn-stack.sh
```

## Chaîne complète (les 3 maillons)

| Étape | Où | Sans ça |
|-------|-----|---------|
| 1. Provision serveur | Site → ACTIVE | Pas d’utilisateur / peer sur le VPS |
| 2. Script MikroTik | Installer ou 3 commandes WG | Pas de tunnel |
| 3. Services VPS | wg0, xl2tpd, openvpn, accel-ppp | Connexion refusée |

**ACTIVE sur le site ≠ MikroTik configuré.** Il faut toujours l’étape 2.

## WireGuard MikroTik (3 lignes, pas de `\`)

```
/interface wireguard add name=wg-nanotech private-key="CLE_PRIVEE_PLATEFORME"
/ip address add address=10.200.100.X/24 interface=wg-nanotech
/interface wireguard peers add interface=wg-nanotech public-key="CLE_PUBLIQUE_SERVEUR" endpoint-address=vpn.nanotechvpn.com endpoint-port=51820 allowed-address=10.200.100.0/24 persistent-keepalive=25s
```

`public-key` = clé du **serveur** (`wg show wg0 public-key` sur le VPS), pas celle du routeur.

## PM2

Toujours : `sudo -u nanotech pm2 ...` (pas root).
