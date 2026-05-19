import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncDeviceVpn } from "@/lib/vpn-sync";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await syncDeviceVpn(session.tenantId, id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof Error && err.message === "DEVICE_NOT_FOUND") {
      return NextResponse.json({ error: "Routeur introuvable" }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Erreur synchronisation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
