/**
 * Validation des variables d'environnement au démarrage (serveur).
 */

const REQUIRED = ["DATABASE_URL", "JWT_SECRET"] as const;

export function validateServerEnv(): void {
  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(`Variables manquantes : ${missing.join(", ")}`);
  }

  const jwt = process.env.JWT_SECRET ?? "";
  if (jwt.length < 32) {
    throw new Error("JWT_SECRET doit faire au moins 32 caractères en production.");
  }

  if (process.env.NODE_ENV === "production") {
    const mode = process.env.PROVISION_MODE ?? "local";
    if (mode === "mock") {
      throw new Error(
        "PROVISION_MODE=mock interdit en production. Utilisez local ou ssh."
      );
    }
    const l2tpPsk = process.env.L2TP_IPSEC_SECRET?.trim() ?? "";
    if (!l2tpPsk || l2tpPsk === "CHANGE_ME_L2TP_PSK") {
      throw new Error(
        "Définissez L2TP_IPSEC_SECRET dans .env (secret IPsec L2TP fort)."
      );
    }
  }
}

export function getProvisionMode(): "mock" | "local" | "ssh" {
  if (process.env.NODE_ENV === "production") {
    const mode = process.env.PROVISION_MODE ?? "local";
    if (mode === "mock") return "local";
    return mode as "local" | "ssh";
  }
  return (process.env.PROVISION_MODE ?? "mock") as "mock" | "local" | "ssh";
}
