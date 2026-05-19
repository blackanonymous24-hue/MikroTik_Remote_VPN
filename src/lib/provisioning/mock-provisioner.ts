import type {
  DevicePingProbeResult,
  ProvisionPayload,
  ProvisionResult,
  VpnProvisioner,
} from "./types";
import { pingDeviceFromPayload } from "./ping-from-payload";

/** Mode développement — simule le provisionnement sans VPS */
export class MockProvisioner implements VpnProvisioner {
  async provision(payload: ProvisionPayload): Promise<ProvisionResult> {
    await delay(800);
    return {
      success: true,
      message: `[MOCK] Device ${payload.deviceName} provisionné (${payload.protocol})`,
      details: { mode: "mock" },
    };
  }

  async deprovision(payload: ProvisionPayload): Promise<ProvisionResult> {
    await delay(400);
    return {
      success: true,
      message: `[MOCK] Device ${payload.deviceName} déprovisionné`,
      details: { mode: "mock" },
    };
  }

  async setVpnEnabled(
    payload: ProvisionPayload,
    enabled: boolean
  ): Promise<ProvisionResult> {
    await delay(300);
    return {
      success: true,
      message: `[MOCK] VPN ${enabled ? "activé" : "désactivé"} — ${payload.deviceName}`,
      details: { mode: "mock", enabled },
    };
  }

  async pingDevice(payload: ProvisionPayload): Promise<DevicePingProbeResult> {
    return pingDeviceFromPayload(payload);
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
