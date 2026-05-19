import { getSession } from "@/lib/auth";
import { APP_DOMAIN, APP_URL, VPN_HOST, VPN_WG_ENDPOINT } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/settings/logout-button";
import { SyncVpnButton } from "@/components/settings/sync-vpn-button";
import { VpnDiagnosticsCard } from "@/components/settings/vpn-diagnostics-card";
import { getWireGuardServerPublicKeyForUi } from "@/lib/vpn-sync";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
  });

  const wgServerKey = await getWireGuardServerPublicKeyForUi();

  return (
    <>
      <PageHeader title="Settings" description="Paramètres du tenant" />
      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Compte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{session.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tenant</span>
              <span className="font-medium">{tenant?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-xs">{tenant?.slug}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Domaines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Plateforme SaaS</p>
              <p className="font-mono text-xs">{APP_DOMAIN}</p>
              <p className="text-xs text-muted-foreground">{APP_URL}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Serveur VPN (routeurs)</p>
              <p className="font-mono text-xs">{VPN_HOST}</p>
              <p className="text-xs text-muted-foreground">WireGuard : {VPN_WG_ENDPOINT}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              VPN classique : ports Winbox/WebFig/API distincts par device.
              WireGuard : une IP pour tous les services.
            </p>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Clé publique serveur WG</p>
              <p className="font-mono text-[10px] break-all text-foreground/80">
                {wgServerKey || "Non configurée — wg show wg0 public-key sur le VPS"}
              </p>
            </div>
          </CardContent>
        </Card>
        <VpnDiagnosticsCard />
        <Card>
          <CardHeader>
            <CardTitle>Synchroniser VPN (tous les routeurs)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Met à jour host, endpoints, secret L2TP et reprovisionne sur le serveur tous les
              routeurs déjà actifs ou en échec. Les nouveaux routeurs utilisent automatiquement la
              config actuelle.
            </p>
            <SyncVpnButton />
          </CardContent>
        </Card>
        <LogoutButton />
      </div>
    </>
  );
}
