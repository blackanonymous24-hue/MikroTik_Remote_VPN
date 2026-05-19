import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getProvisionStatus } from "@/lib/provisioning/provision-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const status = await getProvisionStatus(id, session.tenantId);

  if (!status) {
    return NextResponse.json({ error: "Device introuvable" }, { status: 404 });
  }

  return NextResponse.json(status);
}
