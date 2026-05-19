/**
 * Génération de commandes MikroTik RouterOS v7 — pas de syntaxe wg-quick / Linux.
 */

export const ROS7_INTERFACE = {
  wireguard: "wg-nanotech",
  l2tp: "l2tp-vpn",
  sstp: "sstp-vpn",
  ovpn: "ovpn-vpn",
} as const;

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bendpoint=/i, reason: "Utiliser endpoint-address et endpoint-port" },
  { pattern: /allowed-address=0\.0\.0\.0\/0/i, reason: "allowed-address=0.0.0.0/0 interdit" },
  { pattern: /\bAddress\s*=/i, reason: "Utiliser /ip address add address=" },
  { pattern: /\bPrivateKey\s*=/i, reason: "Utiliser private-key= sur /interface wireguard add" },
  { pattern: /\bListenPort\s*=/i, reason: "ListenPort n'existe pas sur MikroTik WireGuard" },
  { pattern: /wg-quick/i, reason: "wg-quick est Linux uniquement" },
];

export function quoteRos7(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Valide qu'aucune syntaxe interdite n'est présente. */
export function assertRos7Script(script: string): void {
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(script)) {
      throw new Error(`Script MikroTik invalide: ${reason}`);
    }
  }
}

/** Fichier .rsc : une commande par ligne, sans commentaires ni markdown. */
export function toRos7ImportFile(commands: string[]): string {
  const body = commands.map((c) => c.trim()).filter(Boolean).join("\n");
  assertRos7Script(body);
  return `${body}\n`;
}

export function parseWireGuardEndpoint(endpoint: string): { host: string; port: string } {
  if (endpoint.includes(":")) {
    const [host, port] = endpoint.split(":");
    return { host, port: port || "51820" };
  }
  return { host: endpoint, port: "51820" };
}
