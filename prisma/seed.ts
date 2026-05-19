import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "HS";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "root";
  const demoDevices = process.env.SEED_DEMO_DEVICES === "1";

  if (process.env.NODE_ENV === "production" && !process.env.SEED_ADMIN_PASSWORD?.trim()) {
    throw new Error(
      "En production, définissez SEED_ADMIN_PASSWORD dans .env avant RUN_SEED=1."
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "nanotech" },
    update: {},
    create: { name: "nanoTECH", slug: "nanotech" },
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: "Super Admin",
      role: "superadmin",
    },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash,
      name: "Super Admin",
      role: "superadmin",
    },
  });

  const plans = [
    { name: "Starter", slug: "starter", maxDevices: 3, priceMonthly: 0, description: "3 routeurs" },
    { name: "Pro", slug: "pro", maxDevices: 10, priceMonthly: 29, description: "10 routeurs" },
    { name: "Enterprise", slug: "enterprise", maxDevices: 50, priceMonthly: 99, description: "50 routeurs" },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  await prisma.vpnServer.upsert({
    where: { id: "default-server" },
    update: {
      host: process.env.NEXT_PUBLIC_VPN_HOST ?? "vpn.nanotechvpn.com",
      sshHost: process.env.VPN_SSH_HOST ?? "127.0.0.1",
      sshUser: process.env.VPN_SSH_USER ?? "root",
      sshPort: Number(process.env.VPN_SSH_PORT ?? 22),
      provisionPath: process.env.VPN_PROVISION_PATH ?? "/opt/nanotech-vpn",
    },
    create: {
      id: "default-server",
      name: "nanoTECH VPN",
      host: process.env.NEXT_PUBLIC_VPN_HOST ?? "vpn.nanotechvpn.com",
      wgPort: 51820,
      sshHost: process.env.VPN_SSH_HOST ?? "127.0.0.1",
      sshUser: process.env.VPN_SSH_USER ?? "root",
      sshPort: Number(process.env.VPN_SSH_PORT ?? 22),
      provisionPath: process.env.VPN_PROVISION_PATH ?? "/opt/nanotech-vpn",
      isDefault: true,
    },
  });

  if (demoDevices) {
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const existing = await prisma.device.count({ where: { tenantId: tenant.id } });

    if (existing === 0) {
      await prisma.device.create({
        data: {
          tenantId: tenant.id,
          planId: proPlan?.id,
          name: "Routeur démo L2TP",
          protocol: "L2TP",
          vpnIp: "10.200.101.12",
          status: "PENDING",
          provisionStatus: "PENDING",
          expiresAt,
          vpnAccount: {
            create: {
              username: "demo_l2tp",
              password: "demo_pass",
              host: process.env.NEXT_PUBLIC_VPN_HOST ?? "vpn.nanotechvpn.com",
              ipsecSecret: "SECRET",
              winboxPort: 62336,
              webfigPort: 62337,
              apiPort: 62338,
            },
          },
        },
      });
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`Seed OK — admin : ${adminEmail}`);
  } else {
    console.log("Seed OK — admin créé (mot de passe non affiché)");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
