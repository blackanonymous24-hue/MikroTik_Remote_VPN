import type { DevicePingProbeResult } from "./types";

/** Parse la sortie de ping-device.sh ou équivalent TCP côté serveur. */
export function parsePingProbeOutput(output: string): DevicePingProbeResult {
  const text = output.trim();
  if (text.includes("ERROR") || text.includes("OFFLINE")) {
    const msg = text.replace(/^ERROR:\s*/i, "").trim() || "MikroTik hors ligne";
    return { online: false, latencyMs: null, message: msg };
  }

  const latencyMatch = text.match(/latency=(\d+)ms/i);
  const latencyMs = latencyMatch ? Number(latencyMatch[1]) : null;

  if (text.includes("ONLINE") || text.startsWith("OK:")) {
    return {
      online: true,
      latencyMs,
      message: "MikroTik en ligne",
    };
  }

  return { online: false, latencyMs: null, message: "MikroTik hors ligne" };
}
