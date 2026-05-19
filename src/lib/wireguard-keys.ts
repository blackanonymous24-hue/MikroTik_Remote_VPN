import { spawnSync } from "child_process";

/** Paire de clés WireGuard valides (nécessite `wg` installé). */
export function generateWireGuardKeyPair(): { privateKey: string; publicKey: string } {
  const gen = spawnSync("wg", ["genkey"], { encoding: "utf8" });
  if (gen.status !== 0 || !gen.stdout?.trim()) {
    throw new Error(
      "Impossible de générer les clés WireGuard : installez wireguard-tools (wg) sur le serveur."
    );
  }
  const privateKey = gen.stdout.trim();
  const pub = spawnSync("wg", ["pubkey"], {
    input: privateKey,
    encoding: "utf8",
  });
  if (pub.status !== 0 || !pub.stdout?.trim()) {
    throw new Error("wg pubkey a échoué — vérifiez wireguard-tools.");
  }
  return { privateKey, publicKey: pub.stdout.trim() };
}
