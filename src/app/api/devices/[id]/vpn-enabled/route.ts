import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setDeviceVpnEnabled } from "@/lib/provisioning/provision-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) requis" }, { status: 400 });
  }

  try {
    const result = await setDeviceVpnEnabled(id, session.tenantId, body.enabled);
    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json({ success: true, vpnEnabled: body.enabled, message: result.message });
  } catch (err) {
    if (err instanceof Error && err.message === "DEVICE_NOT_FOUND") {
      return NextResponse.json({ error: "Device introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
