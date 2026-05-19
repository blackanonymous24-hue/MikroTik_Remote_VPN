import { execFile } from "child_process";
import { promisify } from "util";
import type {
  DevicePingProbeResult,
  ProvisionPayload,
  ProvisionResult,
  VpnProvisioner,
} from "./types";
import { parsePingProbeOutput } from "./parse-ping-output";

const execFileAsync = promisify(execFile);

type SshConfig = {
  host: string;
  port: number;
  user: string;
  keyPath?: string;
  provisionPath: string;
};

export class SshProvisioner implements VpnProvisioner {
  constructor(private config: SshConfig) {}

  async provision(payload: ProvisionPayload): Promise<ProvisionResult> {
    const script =
      payload.protocol === "WIREGUARD"
        ? "provision-wireguard.sh"
        : "provision-classic.sh";

    const args = buildArgs(payload);
    return this.runRemote(script, args);
  }

  async deprovision(payload: ProvisionPayload): Promise<ProvisionResult> {
    const args = [
      "--device-id", payload.deviceId,
      "--protocol", payload.protocol,
    ];
    if (payload.classic) {
      args.push("--username", payload.classic.username);
    }
    if (payload.wireguard) {
      args.push("--vpn-ip", payload.wireguard.vpnIp);
      args.push("--public-key", payload.wireguard.publicKey);
    }
    return this.runRemote("deprovision.sh", args);
  }

  async setVpnEnabled(
    payload: ProvisionPayload,
    enabled: boolean
  ): Promise<ProvisionResult> {
    const args = [
      "--device-id",
      payload.deviceId,
      "--protocol",
      payload.protocol,
      "--enabled",
      enabled ? "yes" : "no",
    ];
    if (payload.classic) {
      args.push("--username", payload.classic.username);
    }
    if (payload.wireguard) {
      args.push("--public-key", payload.wireguard.publicKey);
      args.push("--vpn-ip", payload.wireguard.vpnIp);
    }
    return this.runRemote("set-vpn-enabled.sh", args);
  }

  async pingDevice(payload: ProvisionPayload): Promise<DevicePingProbeResult> {
    const args = buildArgs(payload);
    const result = await this.runRemote("ping-device.sh", args);
    return parsePingProbeOutput(result.message);
  }

  private async runRemote(script: string, args: string[]): Promise<ProvisionResult> {
    const remoteCmd = `sudo ${this.config.provisionPath}/scripts/${script} ${shellQuoteArgs(args)}`;
    const sshArgs = [
      "-p", String(this.config.port),
      "-o", "StrictHostKeyChecking=accept-new",
      "-o", "BatchMode=yes",
    ];

    if (this.config.keyPath) {
      sshArgs.push("-i", this.config.keyPath);
    }

    sshArgs.push(`${this.config.user}@${this.config.host}`, remoteCmd);

    try {
      const { stdout, stderr } = await execFileAsync("ssh", sshArgs, {
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      });

      const output = (stdout || stderr || "").trim();
      if (output.includes("ERROR")) {
        return { success: false, message: output };
      }

      return {
        success: true,
        message: output || "Provisionnement réussi",
        details: { stdout: output },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur SSH";
      return { success: false, message };
    }
  }
}

function buildArgs(payload: ProvisionPayload): string[] {
  const base = ["--device-id", payload.deviceId, "--protocol", payload.protocol];

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

function shellQuoteArgs(args: string[]): string {
  return args
    .map((a) => `'${a.replace(/'/g, "'\\''")}'`)
    .join(" ");
}
