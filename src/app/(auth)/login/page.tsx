"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("identifier") ?? "").trim(),
          password: form.get("password"),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Connexion réussie");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Identifiant ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md animate-fade-in border-border shadow-md">
        <CardHeader className="space-y-4 pb-2 text-center">
          <BrandLogo size="xl" className="mx-auto mb-1" />
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">nanoTECH VPN</CardTitle>
            <CardDescription className="text-sm">
              Accès distant MikroTik — nanotechvpn.com
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-medium">
                Identifiant
              </Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                defaultValue="HS"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                defaultValue="root"
                required
              />
            </div>
            <Button type="submit" className="mt-1 w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
