import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncTenantVpns } from "@/lib/vpn-sync";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const summary = await syncTenantVpns(session.tenantId, { reprovision: true });
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur synchronisation VPN";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
