"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Diagnostics = {
  provisionMode: string;
  scriptsInstalled: boolean;
  sudoWorks: boolean;
  wgInterfaceUp: boolean;
  wgServerPublicKey: string;
  wgPeerCount: number | null;
  issues: string[];
};

export function VpnDiagnosticsCard() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vpn/diagnostics");
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">État serveur VPN</CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {!data && <p className="text-muted-foreground">Chargement…</p>}
        {data && (
          <>
            <p>
              Mode : <strong>{data.provisionMode}</strong>
            </p>
            <p>Scripts : {data.scriptsInstalled ? "OK" : "manquants"}</p>
            <p>Sudo (provision) : {data.sudoWorks ? "OK" : "échec"}</p>
            <p>WireGuard wg0 : {data.wgInterfaceUp ? "actif" : "inactif"}</p>
            <p>Peers WG : {data.wgPeerCount ?? "—"}</p>
            {data.issues.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-destructive">
                {data.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
            {data.issues.length === 0 && (
              <p className="text-emerald-600">Serveur prêt pour provisionner des routeurs.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
