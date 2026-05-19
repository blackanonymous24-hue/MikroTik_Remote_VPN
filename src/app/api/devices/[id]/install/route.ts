import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { APP_URL } from "@/lib/config";
import {
  buildMikrotikFetchCommand,
  ensureDeviceInstallToken,
} from "@/lib/mikrotik-install-bundle";
import { ensureDeviceVpnReady } from "@/lib/vpn-sync";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { device, provisionResult } = await ensureDeviceVpnReady(session.tenantId, id);

    if (!device) {
      return NextResponse.json({ error: "Routeur introuvable" }, { status: 404 });
    }

    if (provisionResult && !provisionResult.success) {
      return NextResponse.json(
        {
          error: provisionResult.message,
          provisionStatus: device.provisionStatus,
        },
        { status: 422 }
      );
    }

    const token = await ensureDeviceInstallToken(id);
    const base = APP_URL.replace(/\/$/, "");
    const installUrl = `${base}/v/in/${token}`;
    const fetchScript = buildMikrotikFetchCommand(installUrl, base.startsWith("https"));

    return NextResponse.json({
      installUrl,
      fetchScript,
      provisionStatus: device.provisionStatus,
      autoSynced: true,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "DEVICE_NOT_FOUND") {
      return NextResponse.json({ error: "Routeur introuvable" }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Erreur préparation installation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
