import { prisma } from "@/lib/prisma";
import {
  buildProvisionPayload,
  getProvisioner,
  logProvision,
} from "@/lib/provisioning";

export async function getDeviceForProvision(deviceId: string, tenantId: string) {
  return prisma.device.findFirst({
    where: { id: deviceId, tenantId },
    include: {
      vpnAccount: true,
      wireguardPeer: true,
      vpnServer: true,
    },
  });
}

export async function resolveVpnServer(tenantId: string, vpnServerId?: string | null) {
  if (vpnServerId) {
    return prisma.vpnServer.findFirst({
      where: { id: vpnServerId, OR: [{ tenantId }, { tenantId: null }] },
    });
  }
  return prisma.vpnServer.findFirst({
    where: { OR: [{ tenantId }, { isDefault: true, tenantId: null }] },
    orderBy: { isDefault: "desc" },
  });
}

export async function provisionDevice(deviceId: string, tenantId: string) {
  const device = await getDeviceForProvision(deviceId, tenantId);
  if (!device) throw new Error("DEVICE_NOT_FOUND");

  const server = device.vpnServer ?? (await resolveVpnServer(tenantId, device.vpnServerId));
  const host = server?.host ?? device.vpnAccount?.host ?? "vpn.nanotechvpn.com";

  await prisma.device.update({
    where: { id: deviceId },
    data: {
      provisionStatus: "PROVISIONING",
      provisionError: null,
      vpnServerId: server?.id ?? device.vpnServerId,
    },
  });

  await logProvision(deviceId, "provision", "started");

  const payload = buildProvisionPayload(device, host);
  const provisioner = getProvisioner(server);

  try {
    const result = await provisioner.provision(payload);

    if (!result.success) {
      await prisma.device.update({
        where: { id: deviceId },
        data: {
          provisionStatus: "FAILED",
          provisionError: result.message,
          status: "OFFLINE",
        },
      });
      await logProvision(deviceId, "provision", "failed", result.message, result.details as object);
      return { success: false, message: result.message };
    }

    await prisma.device.update({
      where: { id: deviceId },
      data: {
        provisionStatus: "ACTIVE",
        provisionedAt: new Date(),
        provisionError: null,
        status: "ONLINE",
        vpnEnabled: true,
      },
    });

    if (device.protocol === "WIREGUARD" && device.wireguardPeer) {
      await prisma.wireguardPeer.update({
        where: { id: device.wireguardPeer.id },
        data: { lastSeenAt: new Date() },
      });
    }

    await logProvision(deviceId, "provision", "success", result.message, result.details as object);
    return { success: true, message: result.message };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur provisionnement";
    await prisma.device.update({
      where: { id: deviceId },
      data: { provisionStatus: "FAILED", provisionError: message, status: "OFFLINE" },
    });
    await logProvision(deviceId, "provision", "error", message);
    return { success: false, message };
  }
}

export async function deprovisionDevice(deviceId: string, tenantId: string) {
  const device = await getDeviceForProvision(deviceId, tenantId);
  if (!device) throw new Error("DEVICE_NOT_FOUND");

  const server = device.vpnServer ?? (await resolveVpnServer(tenantId, device.vpnServerId));
  const host = server?.host ?? device.vpnAccount?.host ?? "vpn.nanotechvpn.com";

  await prisma.device.update({
    where: { id: deviceId },
    data: { provisionStatus: "DEPROVISIONING" },
  });

  await logProvision(deviceId, "deprovision", "started");

  const payload = buildProvisionPayload(device, host);
  const provisioner = getProvisioner(server);

  try {
    const result = await provisioner.deprovision(payload);

    await prisma.device.update({
      where: { id: deviceId },
      data: {
        provisionStatus: result.success ? "DEPROVISIONED" : "FAILED",
        provisionError: result.success ? null : result.message,
        status: "OFFLINE",
      },
    });

    await logProvision(
      deviceId,
      "deprovision",
      result.success ? "success" : "failed",
      result.message
    );

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur déprovisionnement";
    await prisma.device.update({
      where: { id: deviceId },
      data: { provisionStatus: "FAILED", provisionError: message },
    });
    return { success: false, message };
  }
}

export async function setDeviceVpnEnabled(
  deviceId: string,
  tenantId: string,
  enabled: boolean
) {
  const device = await getDeviceForProvision(deviceId, tenantId);
  if (!device) throw new Error("DEVICE_NOT_FOUND");

  if (device.provisionStatus !== "ACTIVE") {
    return {
      success: false,
      message: "Le routeur doit être provisionné avant d'activer le VPN",
    };
  }

  const server = device.vpnServer ?? (await resolveVpnServer(tenantId, device.vpnServerId));
  const host = server?.host ?? device.vpnAccount?.host ?? "vpn.nanotechvpn.com";
  const payload = buildProvisionPayload(device, host);
  const provisioner = getProvisioner(server);

  const result = await provisioner.setVpnEnabled(payload, enabled);

  if (!result.success) {
    await logProvision(
      deviceId,
      enabled ? "vpn_enable" : "vpn_disable",
      "failed",
      result.message
    );
    return result;
  }

  await prisma.device.update({
    where: { id: deviceId },
    data: { vpnEnabled: enabled },
  });

  await logProvision(
    deviceId,
    enabled ? "vpn_enable" : "vpn_disable",
    "success",
    result.message
  );

  return result;
}

export async function getProvisionStatus(deviceId: string, tenantId: string) {
  const device = await prisma.device.findFirst({
    where: { id: deviceId, tenantId },
    select: {
      id: true,
      provisionStatus: true,
      provisionedAt: true,
      provisionError: true,
      provisionLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  return device;
}
