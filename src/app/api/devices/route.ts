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
    let provision: Awaited<ReturnType<typeof provisionDevice>> | null = null;
    if (autoProvision) {
      provision = await provisionDevice(device.id, session.tenantId);
    }

    const refreshed = await listDevicesForTenant(session.tenantId);
    const created = refreshed.find((d) => d.id === device.id) ?? device;

    return NextResponse.json(
      {
        device: created,
        provision,
        nextStep:
          provision?.success === false
            ? "server_failed"
            : created.provisionStatus === "ACTIVE"
              ? "configure_mikrotik"
              : "provision_manually",
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur création";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
