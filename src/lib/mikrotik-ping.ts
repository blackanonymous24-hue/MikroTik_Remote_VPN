import net from "net";

const DEFAULT_TIMEOUT_MS = 3_000;

/**
 * Test TCP sur le port RouterOS API (équivalent Mikhmon fsockopen).
 * Si le socket s'ouvre, le MikroTik est joignable via le tunnel VPN.
 */
export function tcpPingHost(
  host: string,
  port: number,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ online: boolean; latencyMs: number | null }> {
  const started = Date.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (online: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      const elapsed = Date.now() - started;
      resolve({
        online,
        latencyMs: online ? elapsed : null,
      });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}
