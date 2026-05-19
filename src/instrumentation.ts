export async function register() {
  if (process.env.NODE_ENV === "production") {
    const { validateServerEnv } = await import("@/lib/env");
    validateServerEnv();
  }
}
