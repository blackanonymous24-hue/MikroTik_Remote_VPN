import { NextResponse } from "next/server";
import {
  buildMikrotikImportFile,
  resolveDeviceByInstallToken,
} from "@/lib/mikrotik-install-bundle";

type Params = { params: Promise<{ token: string }> };

/** Endpoint public (token secret) — même principe que Mikroot /v/in/... */
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;

  const device = await resolveDeviceByInstallToken(token);
  if (!device) {
    return new NextResponse("# Fichier introuvable ou token invalide", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const body = await buildMikrotikImportFile(device.id);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("# Erreur génération script", { status: 500 });
  }
}
