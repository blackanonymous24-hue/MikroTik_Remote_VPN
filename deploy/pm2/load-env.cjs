const fs = require("fs");
const path = require("path");

/** Charge un fichier .env simple (sans dépendance dotenv). */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function getPm2Env(appDir, overrides = {}) {
  const fileEnv = loadEnvFile(path.join(appDir, ".env"));
  return {
    NODE_ENV: "production",
    PORT: fileEnv.PORT || "3000",
    ...fileEnv,
    ...overrides,
  };
}

module.exports = { loadEnvFile, getPm2Env };
