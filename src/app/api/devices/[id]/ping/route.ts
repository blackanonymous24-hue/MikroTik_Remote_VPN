import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pingMikrotikDevice } from "@/lib/device-ping";
import { updateDeviceLatency } from "@/lib/device-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const ping = await pingMikrotikDevice(id, session.tenantId);

    const device = await updateDeviceLatency(
      id,
      session.tenantId,
      ping.latencyMs,
      ping.status
    );

    return NextResponse.json({
      online: ping.online,
      status: device.status,
      latencyMs: ping.online ? device.latencyMs : null,
      message: ping.message,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "DEVICE_NOT_FOUND") {
      return NextResponse.json({ error: "Device introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur ping" }, { status: 500 });
  }
}
