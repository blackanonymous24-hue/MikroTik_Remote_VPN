import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deprovisionDevice } from "@/lib/provisioning/provision-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await deprovisionDevice(id, session.tenantId);
    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "DEVICE_NOT_FOUND") {
      return NextResponse.json({ error: "Device introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur déprovisionnement" }, { status: 500 });
  }
}
