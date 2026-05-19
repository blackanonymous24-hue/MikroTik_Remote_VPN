import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { VPN_HOST, VPN_WG_ENDPOINT } from "@/lib/config";
import { getWireGuardServerPublicKeyForUi } from "@/lib/vpn-sync";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const serverPublicKey = await getWireGuardServerPublicKeyForUi();

  return NextResponse.json({
    vpnHost: VPN_HOST,
    wgEndpoint: VPN_WG_ENDPOINT,
    serverPublicKey,
    serverPublicKeyConfigured: Boolean(serverPublicKey),
  });
}
