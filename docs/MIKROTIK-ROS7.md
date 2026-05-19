# Scripts MikroTik — RouterOS v7

Génération centralisée dans `src/lib/mikrotik-ros7.ts` et `src/lib/mikrotik-scripts.ts`.

## Installation (bouton Installer)

Affiche uniquement :

```
/tool fetch url="https://nanotechvpn.com/v/in/TOKEN" mode=https dst-path=setup.rsc
/import file-name=setup.rsc
```

Le fichier `setup.rsc` est généré côté serveur (`GET /v/in/[token]`), text/plain, sans markdown.

## Interfaces

| Protocole | Nom interface |
|-----------|----------------|
| WireGuard | `wg-nanotech` |
| L2TP | `l2tp-vpn` |
| SSTP | `sstp-vpn` |
| OVPN | `ovpn-vpn` |

## WireGuard — interdit

- `endpoint=host:port`
- `allowed-address=0.0.0.0/0`
- Syntaxe wg-quick / `PrivateKey=` / `Address=`

## WireGuard — obligatoire

- `endpoint-address=` + `endpoint-port=`
- `/interface wireguard add name=wg-nanotech private-key="..."`
- `/ip address add address=10.200.100.X/24 interface=wg-nanotech`

## Détail UI

- **VPN classique** : Winbox, WebFig, API → `host:port`
- **WireGuard** : adresse VPN uniquement (`10.200.100.X`)
