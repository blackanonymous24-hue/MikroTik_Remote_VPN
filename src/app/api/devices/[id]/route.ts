import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteDevice } from "@/lib/device-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    await deleteDevice(id, session.tenantId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Device introuvable" }, { status: 404 });
  }
}
