#!/bin/bash
# Installation services VPN sur Ubuntu 24.04
set -euo pipefail

INSTALL_DIR="/opt/nanotech-vpn"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

detect_wan_iface() {
  local iface
  iface=$(ip route show default 2>/dev/null | awk '{print $5; exit}')
  if [[ -n "$iface" ]]; then
    echo "$iface"
    return
  fi
  for c in eth0 ens3 enp0s3 eno1; do
    if ip link show "$c" &>/dev/null; then
      echo "$c"
      return
    fi
  done
  echo "eth0"
}

WAN_IFACE="${WAN_IFACE:-$(detect_wan_iface)}"
echo "Interface WAN détectée : ${WAN_IFACE}"

echo "==> Paquets VPN"
apt-get update
apt-get install -y wireguard wireguard-tools iptables xl2tpd ppp strongswan

echo "==> Copie scripts provisionnement"
mkdir -p "${INSTALL_DIR}/scripts"
cp -r "${REPO_DIR}/deploy/vpn-server/scripts/"* "${INSTALL_DIR}/scripts/"
chmod +x "${INSTALL_DIR}/scripts/"*.sh

mkdir -p /var/lib/nanotech-vpn
chown -R root:root "${INSTALL_DIR}" /var/lib/nanotech-vpn

echo "==> xl2tpd (L2TP)"
mkdir -p /etc/xl2tpd
if [[ ! -f /etc/xl2tpd/xl2tpd.conf ]]; then
  cat > /etc/xl2tpd/xl2tpd.conf <<'EOF'
[global]
listen-addr = 0.0.0.0
port = 1701

[lns default]
ip range = 10.200.101.200-10.200.101.250
local ip = 10.200.101.1
require chap = yes
refuse pap = yes
require authentication = yes
name = nanotech-l2tp
ppp debug = no
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
EOF
fi

if [[ ! -f /etc/ppp/options.xl2tpd ]]; then
  cat > /etc/ppp/options.xl2tpd <<'EOF'
ipcp-accept-local
ipcp-accept-remote
ms-dns 8.8.8.8
ms-dns 8.8.4.4
noccp
auth
idle 1800
mtu 1410
mru 1410
nodefaultroute
debug
lock
proxyarp
connect-delay 5000
EOF
fi

systemctl enable xl2tpd 2>/dev/null || true
systemctl restart xl2tpd 2>/dev/null || true

echo "==> IPsec (L2TP)"
if [[ ! -f /etc/ipsec.conf ]]; then
  cat > /etc/ipsec.conf <<'EOF'
config setup
  charondebug="ike 1, knl 1, cfg 0"

conn l2tp-psk
  auto=add
  keyexchange=ikev1
  type=transport
  left=%defaultroute
  leftprotoport=17/1701
  right=%any
  rightprotoport=17/%any
  authby=secret
EOF
fi

echo "==> WireGuard"
if [[ ! -f /etc/wireguard/wg0.conf ]]; then
  WG_PRIV=$(wg genkey)
  WG_PUB=$(echo "$WG_PRIV" | wg pubkey)
  cat > /etc/wireguard/wg0.conf <<EOF
[Interface]
Address = 10.200.100.1/24
ListenPort = 51820
PrivateKey = ${WG_PRIV}
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o ${WAN_IFACE} -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o ${WAN_IFACE} -j MASQUERADE

# Clé publique serveur (clients MikroTik) : ${WG_PUB}
EOF
  chmod 600 /etc/wireguard/wg0.conf
  systemctl enable wg-quick@wg0
  systemctl start wg-quick@wg0 || true
fi

echo "==> IP forwarding"
grep -q 'net.ipv4.ip_forward=1' /etc/sysctl.conf || echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
sysctl -p

echo "==> Sudoers (utilisateur nanotech → scripts VPN)"
if ! getent group nanotech &>/dev/null; then
  groupadd nanotech 2>/dev/null || true
fi
cat > /etc/sudoers.d/nanotech-vpn <<SUDO
# nanoTECH VPN provisioning
%nanotech ALL=(root) NOPASSWD: ${INSTALL_DIR}/scripts/*.sh
SUDO

echo "==> Pare-feu (ports VPN)"
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 51820/udp comment 'WireGuard' || true
  ufw allow 1701/udp comment 'L2TP' || true
  ufw allow 500,4500/udp comment 'IPsec' || true
  ufw allow 62336:62400/tcp comment 'MikroTik remote ports' || true
fi

echo "=== VPN Server installé dans ${INSTALL_DIR} ==="
echo "    WAN=${WAN_IFACE} | L2TP actif | WG actif"
echo "    Déployez l'app avec PROVISION_MODE=local"
