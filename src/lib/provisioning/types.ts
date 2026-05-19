import type { DeviceProtocol } from "@prisma/client";

export type ClassicProvisionPayload = {
  protocol: "L2TP" | "SSTP" | "OVPN";
  username: string;
  password: string;
  ipsecSecret?: string | null;
  winboxPort: number;
  webfigPort: number;
  apiPort: number;
  routerVpnIp?: string;
};

export type WireGuardProvisionPayload = {
  publicKey: string;
  privateKey: string;
  vpnIp: string;
  endpoint: string;
};

export type ProvisionPayload = {
  deviceId: string;
  deviceName: string;
  protocol: DeviceProtocol;
  host: string;
  classic?: ClassicProvisionPayload;
  wireguard?: WireGuardProvisionPayload;
};

export type ProvisionResult = {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
};

/** Résultat ping exécuté côté plateforme / serveur VPN (pas le navigateur). */
export type DevicePingProbeResult = {
  online: boolean;
  latencyMs: number | null;
  message: string;
};

export interface VpnProvisioner {
  provision(payload: ProvisionPayload): Promise<ProvisionResult>;
  deprovision(payload: ProvisionPayload): Promise<ProvisionResult>;
  setVpnEnabled(payload: ProvisionPayload, enabled: boolean): Promise<ProvisionResult>;
  pingDevice(payload: ProvisionPayload): Promise<DevicePingProbeResult>;
}
