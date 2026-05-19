import { prisma } from "@/lib/prisma";
import { allocateClassicVpnIpv4 } from "@/lib/classic-vpn-ip";
import { allocateWireGuardIpv4 } from "@/lib/wireguard-ip";
import { generateWireGuardKeyPair } from "@/lib/wireguard-keys";
import { getProvisionMode } from "@/lib/env";
import { VPN_HOST, VPN_WG_ENDPOINT } from "@/lib/config";
import type { DeviceProtocol, DeviceStatus } from "@prisma/client";
import crypto from "crypto";

function resolveWireGuardKeys(): { privateKey: string; publicKey: string } {
  if (getProvisionMode() === "mock") {
    return {
      privateKey: "MOCK_WG_PRIVATE_DEV_ONLY",
      publicKey: "MOCK_WG_PUBLIC_DEV_ONLY",
    };
  }
  return generateWireGuardKeyPair();
}

function resolveL2tpIpsecSecret(): string {
  return process.env.L2TP_IPSEC_SECRET?.trim() || "CHANGE_ME_L2TP_PSK";
}

function nextPorts(base: number): { winbox: number; webfig: number; api: number } {
  const offset = base * 3;
  return {
    winbox: 62336 + offset,
    webfig: 62337 + offset,
    api: 62338 + offset,
  };
}

export async function listDevicesForTenant(tenantId: string) {
  return prisma.device.findMany({
    where: { tenantId },
    include: {
      plan: true,
      vpnAccount: true,
      wireguardPeer: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listClassicVpnDevices(tenantId: string) {
  return prisma.device.findMany({
    where: {
      tenantId,
      protocol: { in: ["L2TP", "SSTP", "OVPN"] },
    },
    include: { vpnAccount: true, plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listWireGuardDevices(tenantId: string) {
  return prisma.device.findMany({
    where: { tenantId, protocol: "WIREGUARD" },
    include: { wireguardPeer: true, plan: true },
    orderBy: { createdAt: "desc" },
  });
}

async function resolveDefaultServer(tenantId: string, serverHost?: string) {
  const server = await prisma.vpnServer.findFirst({
    where: {
      OR: [{ tenantId }, { isDefault: true, tenantId: null }],
      ...(serverHost ? { host: serverHost } : {}),
    },
    orderBy: { isDefault: "desc" },
  });
  return server;
}

export async function createDevice(input: {
  tenantId: string;
  name: string;
  protocol: DeviceProtocol;
  planId?: string | null;
  serverHost?: string;
  autoProvision?: boolean;
}) {
  const count = await prisma.device.count({ where: { tenantId: input.tenantId } });
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const server = await resolveDefaultServer(input.tenantId, input.serverHost);
  const host = server?.host ?? input.serverHost ?? VPN_HOST;
  const wgEndpoint = VPN_WG_ENDPOINT;

  if (input.protocol === "WIREGUARD") {
    const wgIp = allocateWireGuardIpv4(count);
    const keys = resolveWireGuardKeys();
    const device = await prisma.device.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        protocol: "WIREGUARD",
        planId: input.planId,
        vpnServerId: server?.id,
        vpnIp: wgIp,
        status: "PENDING",
        provisionStatus: "PENDING",
        expiresAt,
        wireguardPeer: {
          create: {
            publicKey: keys.publicKey,
            privateKey: keys.privateKey,
            vpnIp: wgIp,
            endpoint: wgEndpoint,
          },
        },
      },
      include: { wireguardPeer: true, plan: true },
    });
    return device;
  }

  const ports = nextPorts(count);
  const username = `user_${crypto.randomBytes(4).toString("hex")}`;
  const password = crypto.randomBytes(8).toString("hex");

  const classicVpnIp = allocateClassicVpnIpv4(count);

  const device = await prisma.device.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      protocol: input.protocol,
      planId: input.planId,
      vpnServerId: server?.id,
      vpnIp: classicVpnIp,
      status: "PENDING",
      provisionStatus: "PENDING",
      expiresAt,
      vpnAccount: {
        create: {
          username,
          password,
          host,
          ipsecSecret: input.protocol === "L2TP" ? resolveL2tpIpsecSecret() : null,
          winboxPort: ports.winbox,
          webfigPort: ports.webfig,
          apiPort: ports.api,
        },
      },
    },
    include: { vpnAccount: true, plan: true },
  });

  return device;
}

export async function updateDeviceLatency(
  deviceId: string,
  tenantId: string,
  latencyMs: number | null,
  status: DeviceStatus
) {
  const device = await prisma.device.update({
    where: { id: deviceId, tenantId },
    data: {
      latencyMs: latencyMs ?? null,
      status,
    },
    include: { wireguardPeer: true },
  });

  if (device.protocol === "WIREGUARD" && device.wireguardPeer) {
    await prisma.wireguardPeer.update({
      where: { id: device.wireguardPeer.id },
      data: { lastSeenAt: new Date() },
    });
  }

  return device;
}

export async function deleteDevice(deviceId: string, tenantId: string) {
  return prisma.device.delete({
    where: { id: deviceId, tenantId },
  });
}

export async function getDashboardStats(tenantId: string) {
  const [total, online, classic, wireguard] = await Promise.all([
    prisma.device.count({ where: { tenantId } }),
    prisma.device.count({ where: { tenantId, status: "ONLINE" } }),
    prisma.device.count({
      where: { tenantId, protocol: { in: ["L2TP", "SSTP", "OVPN"] } },
    }),
    prisma.device.count({ where: { tenantId, protocol: "WIREGUARD" } }),
  ]);

  return { total, online, offline: total - online, classic, wireguard };
}
