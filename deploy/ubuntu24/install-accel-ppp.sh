#!/bin/bash
# Compile et installe accel-ppp (SSTP) sur Ubuntu 24.04 si absent des dépôts
set -euo pipefail

if command -v accel-pppd &>/dev/null || systemctl list-unit-files 2>/dev/null | grep -q '^accel-ppp'; then
  echo "accel-ppp déjà installé."
  exit 0
fi

if apt-cache show accel-ppp &>/dev/null 2>&1; then
  apt-get update
  apt-get install -y accel-ppp
  systemctl enable accel-ppp 2>/dev/null || true
  echo "accel-ppp installé via apt."
  exit 0
fi

echo "==> Compilation accel-ppp depuis les sources (5–10 min)"
apt-get update
apt-get install -y git cmake g++ libssl-dev libpcre2-dev libtalloc-dev liblua5.1-0-dev \
  libmnl-dev libkmod-dev libsystemd-dev liburing-dev libnl-3-dev libnl-genl-3-dev

BUILD_DIR="/tmp/accel-ppp-build"
rm -rf "$BUILD_DIR"
git clone --depth 1 --branch v1.14.0 https://github.com/accel-ppp/accel-ppp.git "$BUILD_DIR"
cd "$BUILD_DIR"
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr -DBUILD_IPOE_DRIVER=FALSE ..
make -j"$(nproc)"
make install
ldconfig

if [[ ! -f /lib/systemd/system/accel-ppp.service ]] && [[ ! -f /etc/systemd/system/accel-ppp.service ]]; then
  cat > /etc/systemd/system/accel-ppp.service <<'EOF'
[Unit]
Description=Accel-PPP SSTP/L2TP server
After=network.target

[Service]
Type=simple
ExecStart=/usr/sbin/accel-pppd -c /etc/accel-ppp.conf
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
fi

systemctl enable accel-ppp
echo "accel-ppp compilé et installé."
