"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CreditCard,
  LayoutDashboard,
  Menu,
  Monitor,
  Router,
  ScrollText,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/devices", label: "Routeurs", icon: Router },
  { href: "/vpn-accounts", label: "Comptes VPN", icon: Shield },
  { href: "/wireguard", label: "WireGuard", icon: Activity },
  { href: "/monitoring", label: "Monitoring", icon: Monitor },
  { href: "/scripts", label: "Scripts", icon: ScrollText },
  { href: "/billing", label: "Facturation", icon: CreditCard },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex-shrink-0 px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="md" />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-none text-white">nanoTECH VPN</p>
            <p className="mt-0.5 truncate text-[10px] leading-none text-gray-500">
              Accès distant MikroTik
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px flex-shrink-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-400/40",
                active
                  ? "bg-blue-500/15 text-blue-300 shadow-[inset_2px_0_0_#60a5fa]"
                  : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-100"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-blue-400" : "text-gray-500"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-shrink-0 border-t border-white/[0.06] px-4 py-3">
        <p className="text-[10px] leading-relaxed text-gray-600">
          Winbox · WebFig · API
        </p>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0d1117] text-gray-300 shadow-md hover:bg-white/10 hover:text-white lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-white/[0.06] bg-[#0d1117] text-white transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          className="absolute right-3 top-4 text-gray-400 hover:text-white lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
        <NavContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      <aside className="hidden w-60 shrink-0 lg:block" aria-hidden>
        <div className="fixed inset-y-0 flex w-60 flex-col border-r border-white/[0.06] bg-[#0d1117]">
          <NavContent />
        </div>
      </aside>
    </>
  );
}
