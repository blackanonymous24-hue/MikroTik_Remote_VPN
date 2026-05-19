import { getSession } from "@/lib/auth";
import { VPN_HOST } from "@/lib/config";
import { WG_NETWORK_CIDR } from "@/lib/wireguard-ip";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const scripts = [
  {
    title: "Vérifier interface VPN",
    description: "Liste les interfaces VPN actives",
    code: "/interface print where type~\"l2tp|sstp|ovpn|wireguard\"",
  },
  {
    title: "Test connectivité backbone",
    description: "Ping vers le serveur nanoTECH",
    code: `/ping ${VPN_HOST} count=5`,
  },
  {
    title: "Route backbone voucher",
    description: "Route statique vers le réseau voucher",
    code: `/ip route add dst-address=${WG_NETWORK_CIDR} gateway=wg-nanotech`,
  },
];

export default async function ScriptsPage() {
  await getSession();

  return (
    <>
      <PageHeader
        title="Scripts"
        description="Scripts MikroTik utiles pour la maintenance"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scripts.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="text-base">{s.title}</CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-emerald-400">
                {s.code}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
