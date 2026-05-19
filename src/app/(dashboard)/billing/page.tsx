import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function BillingPage() {
  await getSession();
  const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } });

  return (
    <>
      <PageHeader
        title="Billing"
        description="Plans d'abonnement (démo — sans paiement réel)"
      />
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan: (typeof plans)[number], i: number) => (
          <Card
            key={plan.id}
            className={i === 1 ? "border-primary ring-2 ring-primary/20" : ""}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-bold">
                {plan.priceMonthly === 0 ? "Gratuit" : `${plan.priceMonthly} €`}
                {plan.priceMonthly > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">/mois</span>
                )}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Jusqu&apos;à {plan.maxDevices} routeurs</li>
                <li>Winbox · WebFig · API</li>
                <li>WireGuard & VPN classiques</li>
              </ul>
              <Button variant={i === 1 ? "default" : "outline"} className="w-full" disabled>
                {i === 1 ? "Plan actuel" : "Choisir"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
