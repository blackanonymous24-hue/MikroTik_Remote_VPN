import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createDevice, listDevicesForTenant } from "@/lib/device-service";
import { provisionDevice } from "@/lib/provisioning/provision-service";
import type { DeviceProtocol } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const devices = await listDevicesForTenant(session.tenantId);
  return NextResponse.json(devices);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await request.json();
    const device = await createDevice({
      tenantId: session.tenantId,
      name: body.name,
      protocol: body.protocol as DeviceProtocol,
      planId: body.planId,
      serverHost: body.serverHost,
    });

    const autoProvision = body.autoProvision !== false;
    if (autoProvision) {
      await provisionDevice(device.id, session.tenantId);
    }

    const refreshed = await listDevicesForTenant(session.tenantId);
    const created = refreshed.find((d) => d.id === device.id) ?? device;

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur création" }, { status: 500 });
  }
}
