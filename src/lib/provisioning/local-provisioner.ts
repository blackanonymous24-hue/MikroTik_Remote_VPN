import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import type {
  DevicePingProbeResult,
  ProvisionPayload,
  ProvisionResult,
  VpnProvisioner,
} from "./types";
import { parsePingProbeOutput } from "./parse-ping-output";

const execFileAsync = promisify(execFile);

/** Exécute les scripts directement sur le VPS (app + VPN sur même machine) */
export class LocalProvisioner implements VpnProvisioner {
  constructor(private provisionPath: string) {}

  async provision(payload: ProvisionPayload): Promise<ProvisionResult> {
    const script =
      payload.protocol === "WIREGUARD"
        ? "provision-wireguard.sh"
        : "provision-classic.sh";
    return this.runScript(script, payload);
  }

  async deprovision(payload: ProvisionPayload): Promise<ProvisionResult> {
    return this.runScript("deprovision.sh", payload);
  }

  async setVpnEnabled(
    payload: ProvisionPayload,
    enabled: boolean
  ): Promise<ProvisionResult> {
    return this.runScript("set-vpn-enabled.sh", payload, enabled);
  }

  async pingDevice(payload: ProvisionPayload): Promise<DevicePingProbeResult> {
    try {
      const result = await this.runScript("ping-device.sh", payload);
      return parsePingProbeOutput(result.message);
    } catch {
      return { online: false, latencyMs: null, message: "MikroTik hors ligne" };
    }
  }

  private async runScript(
    script: string,
    payload: ProvisionPayload,
    enabled?: boolean
  ): Promise<ProvisionResult> {
    const scriptPath = path.join(this.provisionPath, "scripts", script);
    const args = buildLocalArgs(payload, enabled);

    try {
      const { stdout, stderr } = await execFileAsync("sudo", [scriptPath, ...args], {
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      });

      const output = (stdout || stderr || "").trim();
      if (output.includes("ERROR")) {
        return { success: false, message: output };
      }

      return { success: true, message: output || "OK", details: { stdout: output } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur script local";
      return { success: false, message };
    }
  }
}

function buildLocalArgs(payload: ProvisionPayload, enabled?: boolean): string[] {
  const base = ["--device-id", payload.deviceId, "--protocol", payload.protocol];
  if (enabled !== undefined) {
    base.push("--enabled", enabled ? "yes" : "no");
  }

  if (payload.protocol === "WIREGUARD" && payload.wireguard) {
    const wg = payload.wireguard;
    return [
      ...base,
      "--public-key", wg.publicKey,
      "--private-key", wg.privateKey,
      "--vpn-ip", wg.vpnIp,
      "--endpoint", wg.endpoint,
    ];
  }

  if (payload.classic) {
    const c = payload.classic;
    return [
      ...base,
      "--username", c.username,
      "--password", c.password,
      "--winbox-port", String(c.winboxPort),
      "--webfig-port", String(c.webfigPort),
      "--api-port", String(c.apiPort),
      ...(c.ipsecSecret ? ["--ipsec-secret", c.ipsecSecret] : []),
      ...(c.routerVpnIp ? ["--router-vpn-ip", c.routerVpnIp] : []),
    ];
  }

  return base;
}
