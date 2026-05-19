"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "nanotech-vpn-last-sync";
const INTERVAL_MS = Number(process.env.NEXT_PUBLIC_VPN_AUTO_SYNC_MINUTES ?? "30") * 60_000;

/**
 * Synchronise automatiquement tous les VPN du tenant (session connectée).
 * Au plus une fois toutes les 30 min par navigateur (évite surcharge VPS).
 */
export function AutoVpnSync() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const last = Number(sessionStorage.getItem(STORAGE_KEY) ?? "0");
    if (Date.now() - last < INTERVAL_MS) return;

    fetch("/api/vpn/sync", { method: "POST" })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
      })
      .catch(() => {
        /* silencieux — bouton manuel toujours disponible */
      });
  }, []);

  return null;
}
