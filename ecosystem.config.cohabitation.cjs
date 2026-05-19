const path = require("path");
const { getPm2Env } = require("./deploy/pm2/load-env.cjs");

const appDir = process.env.APP_DIR || "/var/www/nanotech-vpn";

module.exports = {
  apps: [
    {
      name: "nanotech-vpn",
      script: "npm",
      args: "start",
      cwd: appDir,
      env: getPm2Env(appDir, { PORT: process.env.PORT || "3002" }),
    },
  ],
};
