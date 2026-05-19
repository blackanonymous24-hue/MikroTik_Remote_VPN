import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { MockProvisioner } from "./mock-provisioner";
import { LocalProvisioner } from "./local-provisioner";
import { SshProvisioner } from "./ssh-provisioner";
import type { ProvisionPayload, ProvisionResult, VpnProvisioner } from "./types";
import type { Device, VpnAccount, WireguardPeer, VpnServer } from "@prisma/client";
import { getProvisionMode } from "@/lib/env";

export function getProvisioner(server?: VpnServer | null): VpnProvisioner {
  const mode = getProvisionMode();
  const provisionPath =
    server?.provisionPath ?? process.env.VPN_PROVISION_PATH ?? "/opt/nanotech-vpn";

  if (mode === "local") {
    return new LocalProvisioner(provisionPath);
  }

  if (mode === "ssh") {
    const host = server?.sshHost ?? process.env.VPN_SSH_HOST ?? server?.host;
    const user = server?.sshUser ?? process.env.VPN_SSH_USER ?? "root";
    const port = server?.sshPort ?? Number(process.env.VPN_SSH_PORT ?? 22);
    if (!host) throw new Error("VPN_SSH_HOST non configuré");

    return new SshProvisioner({
      host,
      port,
      user,
      keyPath: process.env.VPN_SSH_KEY_PATH,
      provisionPath,
    });
  }

  return new MockProvisioner();
}

export function buildProvisionPayload(
  device: Device & {
    vpnAccount: VpnAccount | null;
    wireguardPeer: WireguardPeer | null;
  },
  host: string
): ProvisionPayload {
  const base: ProvisionPayload = {
    deviceId: device.id,
    deviceName: device.name,
    protocol: device.protocol,
    host,
  };

  if (device.protocol === "WIREGUARD" && device.wireguardPeer) {
    base.wireguard = {
      publicKey: device.wireguardPeer.publicKey,
      privateKey: device.wireguardPeer.privateKey,
      vpnIp: device.wireguardPeer.vpnIp,
      endpoint: device.wireguardPeer.endpoint,
    };
  }

  if (device.vpnAccount) {
    base.classic = {
      protocol: device.protocol as "L2TP" | "SSTP" | "OVPN",
      username: device.vpnAccount.username,
      password: device.vpnAccount.password,
      ipsecSecret: device.vpnAccount.ipsecSecret,
      winboxPort: device.vpnAccount.winboxPort,
      webfigPort: device.vpnAccount.webfigPort,
      apiPort: device.vpnAccount.apiPort,
      routerVpnIp: device.vpnIp ?? undefined,
    };
  }

  return base;
}

export async function logProvision(
  deviceId: string,
  action: string,
  status: string,
  message?: string,
  payload?: Prisma.InputJsonValue
) {
  await prisma.provisionLog.create({
    data: {
      deviceId,
      action,
      status,
      message,
      payload,
    },
  });
}

export type { ProvisionPayload, ProvisionResult };
