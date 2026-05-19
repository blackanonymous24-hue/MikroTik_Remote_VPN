#!/bin/bash
# Bibliothèque commune — scripts provisionnement nanoTECH VPN

set -euo pipefail

DATA_DIR="${NANOTECH_VPN_DATA:-/var/lib/nanotech-vpn}"
CLASSIC_USERS="${DATA_DIR}/classic-users.conf"
WG_PEERS="${DATA_DIR}/wireguard-peers.conf"
PORT_FORWARDS="${DATA_DIR}/port-forwards.conf"

mkdir -p "$DATA_DIR"

parse_args() {
  DEVICE_ID=""
  PROTOCOL=""
  USERNAME=""
  PASSWORD=""
  IPSEC_SECRET=""
  WINBOX_PORT=""
  WEBFIG_PORT=""
  API_PORT=""
  PUBLIC_KEY=""
  PRIVATE_KEY=""
  VPN_IP=""
  ENDPOINT=""
  ENABLED=""
  PING_HOST=""
  ROUTER_VPN_IP=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --device-id) DEVICE_ID="$2"; shift 2 ;;
      --protocol) PROTOCOL="$2"; shift 2 ;;
      --username) USERNAME="$2"; shift 2 ;;
      --password) PASSWORD="$2"; shift 2 ;;
      --ipsec-secret) IPSEC_SECRET="$2"; shift 2 ;;
      --winbox-port) WINBOX_PORT="$2"; shift 2 ;;
      --webfig-port) WEBFIG_PORT="$2"; shift 2 ;;
      --api-port) API_PORT="$2"; shift 2 ;;
      --public-key) PUBLIC_KEY="$2"; shift 2 ;;
      --private-key) PRIVATE_KEY="$2"; shift 2 ;;
      --vpn-ip) VPN_IP="$2"; shift 2 ;;
      --endpoint) ENDPOINT="$2"; shift 2 ;;
      --enabled) ENABLED="$2"; shift 2 ;;
      --ping-host) PING_HOST="$2"; shift 2 ;;
      --router-vpn-ip) ROUTER_VPN_IP="$2"; shift 2 ;;
      *) echo "ERROR: Argument inconnu $1"; exit 1 ;;
    esac
  done
}

log_ok() { echo "OK: $*"; }
log_err() { echo "ERROR: $*"; exit 1; }
