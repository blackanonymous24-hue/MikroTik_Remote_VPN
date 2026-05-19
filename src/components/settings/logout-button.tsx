"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Déconnexion");
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="destructive" onClick={handleLogout}>
      Se déconnecter
    </Button>
  );
}
