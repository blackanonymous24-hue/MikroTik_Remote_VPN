import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runVpnDiagnostics } from "@/lib/vpn-diagnostics";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const diagnostics = await runVpnDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Diagnostic impossible";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
