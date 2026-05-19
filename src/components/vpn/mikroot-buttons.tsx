"use client";

import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const base =
  "inline-flex h-8 items-center justify-center rounded-md px-3.5 text-xs font-medium text-white shadow-sm outline-none transition-colors duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60";

export function PingButton({
  loading,
  onClick,
  className,
}: {
  loading?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title="Ping — vérifier si le MikroTik est en ligne"
      disabled={loading}
      onClick={onClick}
      className={cn(
        "h-8 w-8 shrink-0 rounded-full border-input bg-white shadow-sm hover:bg-white",
        className
      )}
    >
      <Activity className={cn("!size-3.5", loading && "animate-spin")} aria-hidden />
    </Button>
  );
}

/** Interrupteur VPN serveur — bouton séparé (style Mikroot). */
export function VpnToggleButton({
  enabled,
  loading,
  disabled,
  onClick,
  className,
}: {
  enabled: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={enabled ? "Désactiver le VPN serveur" : "Activer le VPN serveur"}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-white px-1 shadow-sm outline-none transition-colors duration-150",
        "hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      aria-pressed={enabled}
      aria-label={enabled ? "VPN activé" : "VPN désactivé"}
    >
      <span
        className={cn(
          "relative inline-flex h-3.5 w-6 rounded-full transition-colors duration-200",
          enabled ? "bg-emerald-500" : "bg-slate-300",
          loading && "opacity-70"
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
            enabled ? "left-[13px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function InstallerButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, "bg-sky-600 hover:bg-sky-700", className)}
    >
      Installer
    </button>
  );
}

export function DetailButton({
  active,
  onClick,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        base,
        active
          ? "bg-slate-800 focus-visible:ring-primary/40"
          : "bg-slate-700 hover:bg-slate-800",
        className
      )}
    >
      Détail
    </button>
  );
}
