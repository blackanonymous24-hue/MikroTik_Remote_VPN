"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VPN_HOST } from "@/lib/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Plan = { id: string; name: string };

type AddDeviceDialogProps = {
  plans: Plan[];
};

export function AddDeviceDialog({ plans }: AddDeviceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [server, setServer] = useState(VPN_HOST);
  const [protocol, setProtocol] = useState("L2TP");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, serverHost: server, protocol, planId: planId || null }),
      });
      if (!res.ok) throw new Error("Erreur création");
      toast.success("Routeur ajouté avec succès");
      setOpen(false);
      setName("");
      router.refresh();
    } catch {
      toast.error("Impossible d'ajouter le routeur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Ajouter un routeur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un routeur</DialogTitle>
          <DialogDescription>
            Configurez un nouveau routeur MikroTik pour votre tenant
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              placeholder="Routeur Agence Nord"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="server">Serveur</Label>
            <Input
              id="server"
              placeholder={VPN_HOST}
              value={server}
              onChange={(e) => setServer(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Interface</Label>
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L2TP">L2TP</SelectItem>
                <SelectItem value="SSTP">SSTP</SelectItem>
                <SelectItem value="OVPN">OVPN</SelectItem>
                <SelectItem value="WIREGUARD">WireGuard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Création..." : "Créer le routeur"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
