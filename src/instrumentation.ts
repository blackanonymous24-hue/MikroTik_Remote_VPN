export async function register() {
  if (process.env.NODE_ENV === "production") {
    const { validateServerEnv } = await import("@/lib/env");
    validateServerEnv();

    const { syncVpnServerFromEnvironment } = await import("@/lib/vpn-server-config");
    await syncVpnServerFromEnvironment().catch(() => {
      /* clé WG optionnelle au premier démarrage */
    });
  }
}
