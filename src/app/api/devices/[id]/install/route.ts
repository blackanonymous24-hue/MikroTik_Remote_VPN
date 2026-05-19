import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { APP_URL } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { buildMikrotikFetchCommand, ensureDeviceInstallToken } from "@/lib/mikrotik-install-bundle";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const device = await prisma.device.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true, provisionStatus: true },
  });

  if (!device) {
    return NextResponse.json({ error: "Routeur introuvable" }, { status: 404 });
  }

  const token = await ensureDeviceInstallToken(id);
  const base = APP_URL.replace(/\/$/, "");
  const installUrl = `${base}/v/in/${token}`;
  const fetchScript = buildMikrotikFetchCommand(installUrl, base.startsWith("https"));

  return NextResponse.json({
    installUrl,
    fetchScript,
    provisionStatus: device.provisionStatus,
  });
}
