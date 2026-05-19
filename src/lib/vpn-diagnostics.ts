import "server-only";

import { execFile } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import path from "path";
import { getProvisionMode } from "@/lib/env";
import { readWireGuardServerPublicKey } from "@/lib/vpn-server-config";

const execFileAsync = promisify(execFile);

export type VpnDiagnostics = {
  provisionMode: string;
  provisionPath: string;
  scriptsInstalled: boolean;
  sudoWorks: boolean;
  wgInterfaceUp: boolean;
  wgServerPublicKey: string;
  wgPeerCount: number | null;
  openvpnActive: boolean;
  sstpActive: boolean;
  issues: string[];
};

export async function runVpnDiagnostics(): Promise<VpnDiagnostics> {
  const provisionPath = process.env.VPN_PROVISION_PATH ?? "/opt/nanotech-vpn";
  const scriptDir = path.join(provisionPath, "scripts");
  const issues: string[] = [];

  let scriptsInstalled = false;
  try {
    await access(path.join(scriptDir, "provision-wireguard.sh"));
    scriptsInstalled = true;
  } catch {
    issues.push(`Scripts introuvables dans ${scriptDir}`);
  }

  let sudoWorks = false;
  try {
    await execFileAsync("sudo", ["-n", "true"], { timeout: 3_000 });
    sudoWorks = true;
  } catch {
    issues.push(
      "sudo sans mot de passe impossible pour l'utilisateur app (groupe nanotech + /etc/sudoers.d/nanotech-vpn)"
    );
  }

  let wgInterfaceUp = false;
  let wgPeerCount: number | null = null;
  try {
    const { stdout } = await execFileAsync("wg", ["show", "wg0"], { timeout: 5_000 });
    wgInterfaceUp = true;
    wgPeerCount = (stdout.match(/^peer:/gm) ?? []).length;
  } catch {
    issues.push("Interface WireGuard wg0 inactive ou absente");
  }

  const wgServerPublicKey = readWireGuardServerPublicKey();
  if (!wgServerPublicKey) {
    issues.push(
      "WG_SERVER_PUBLIC_KEY manquant dans .env — lancez deploy/ubuntu24/update-wg-public-key.sh"
    );
  }

  if (getProvisionMode() === "mock") {
    issues.push("PROVISION_MODE=mock : aucun VPN réel sur le serveur");
  }

  let openvpnActive = false;
  try {
    await execFileAsync("systemctl", ["is-active", "--quiet", "openvpn-server@nanotech"], {
      timeout: 3_000,
    });
    openvpnActive = true;
  } catch {
    try {
      await execFileAsync("systemctl", ["is-active", "--quiet", "openvpn@nanotech"], {
        timeout: 3_000,
      });
      openvpnActive = true;
    } catch {
      issues.push("Service OpenVPN (openvpn-server@nanotech) inactif — OVPN ne fonctionnera pas");
    }
  }

  let sstpActive = false;
  try {
    await execFileAsync("systemctl", ["is-active", "--quiet", "accel-ppp"], { timeout: 3_000 });
    sstpActive = true;
  } catch {
    issues.push(
      "Service SSTP (accel-ppp) inactif — lancez deploy/ubuntu24/install-accel-ppp.sh puis setup-vpn-server.sh"
    );
  }

  return {
    provisionMode: getProvisionMode(),
    provisionPath,
    scriptsInstalled,
    sudoWorks,
    wgInterfaceUp,
    wgServerPublicKey,
    wgPeerCount,
    openvpnActive,
    sstpActive,
    issues,
  };
}
