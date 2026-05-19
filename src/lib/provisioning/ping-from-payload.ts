import { tcpPingHost } from "@/lib/mikrotik-ping";
import type { DevicePingProbeResult, ProvisionPayload } from "./types";

/**
 * Ping TCP depuis le processus API (plateforme).
 * Cible le host public du VPN + port DNAT (joignable si le MikroTik est sur le tunnel).
 */
export async function pingDeviceFromPayload(
  payload: ProvisionPayload
): Promise<DevicePingProbeResult> {
  if (payload.protocol === "WIREGUARD" && payload.wireguard) {
    const vpnIp = payload.wireguard.vpnIp.replace(/\/\d+$/, "");
    const internal = await tcpPingHost(vpnIp, 8728);
    if (internal.online) {
      return {
        online: true,
        latencyMs: internal.latencyMs,
        message: "MikroTik en ligne",
      };
    }
  }

  if (payload.classic) {
    const result = await tcpPingHost(payload.host, payload.classic.apiPort);
    if (result.online) {
      return {
        online: true,
        latencyMs: result.latencyMs,
        message: "MikroTik en ligne",
      };
    }
    return {
      online: false,
      latencyMs: null,
      message: "MikroTik hors ligne",
    };
  }

  if (payload.wireguard) {
    const host = payload.host.split(":")[0];
    const fallback = await tcpPingHost(host, 8728);
    return fallback.online
      ? {
          online: true,
          latencyMs: fallback.latencyMs,
          message: "MikroTik en ligne",
        }
      : { online: false, latencyMs: null, message: "MikroTik hors ligne" };
  }

  return { online: false, latencyMs: null, message: "Configuration ping incomplète" };
}
