import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProvisionMode } from "@/lib/env";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      provisionMode: getProvisionMode(),
      nodeEnv: process.env.NODE_ENV ?? "development",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur santé";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
