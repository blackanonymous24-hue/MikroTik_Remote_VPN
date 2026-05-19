"use client";

import { useState } from "react";
import Link from "next/link";
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

type CreateResponse = {
  device: {
    id: string;
    name: string;
    protocol: string;
    provisionStatus: string;
    provisionError: string | null;
  };
  provision: { success: boolean; message: string } | null;
  nextStep: string;
};

export function AddDeviceDialog({ plans }: AddDeviceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [server, setServer] = useState(VPN_HOST);
  const [protocol, setProtocol] = useState("L2TP");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [created, setCreated] = useState<CreateResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setCreated(null);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, serverHost: server, protocol, planId: planId || null }),
      });
      const data = (await res.json()) as CreateResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur création");

      setCreated(data);

      if (data.provision?.success === false) {
        toast.error("Routeur créé mais serveur VPN en échec", {
          description: data.provision.message?.slice(0, 200),
        });
      } else if (data.device.provisionStatus === "ACTIVE") {
        toast.success("Routeur provisionné sur le serveur", {
          description: "Installez maintenant le script sur le MikroTik (bouton Installer).",
        });
      } else {
        toast.warning("Routeur créé — provisionnez-le depuis la liste Devices");
      }

      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'ajouter le routeur");
    } finally {
      setLoading(false);
    }
  }

  function closeAndReset() {
    setOpen(false);
    setCreated(null);
    setName("");
  }

  const installHref =
    created?.device.protocol === "WIREGUARD" ? "/wireguard" : "/vpn-accounts";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setCreated(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Ajouter un routeur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {created ? "Routeur créé" : "Ajouter un routeur"}
          </DialogTitle>
          <DialogDescription>
            {created
              ? "Suivez ces étapes pour que le VPN fonctionne vraiment."
              : "Le serveur VPN sera configuré automatiquement, puis vous installerez le MikroTik."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4 text-sm">
            <ol className="list-decimal space-y-2 pl-4 text-muted-foreground">
              <li>
                Statut serveur :{" "}
                <strong className="text-foreground">
                  {created.device.provisionStatus}
                </strong>
                {created.device.provisionError && (
                  <p className="mt-1 text-xs text-destructive">
                    {created.device.provisionError}
                  </p>
                )}
              </li>
              <li>
                Allez dans{" "}
                <Link href={installHref} className="font-medium text-primary underline">
                  {created.device.protocol === "WIREGUARD"
                    ? "WireGuard"
                    : "Comptes VPN"}
                </Link>
              </li>
              <li>Cliquez sur <strong>Installer</strong> (script MikroTik)</li>
              <li>Collez <strong>une commande à la fois</strong> dans le terminal MikroTik</li>
              <li>Revenez et cliquez <strong>Ping</strong> pour vérifier</li>
            </ol>
            {created.provision?.success === false && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                Échec serveur : {created.provision.message}
                <br />
                Settings → Synchroniser tous les VPN, ou bouton Provisionner dans Devices.
              </p>
            )}
            <Button type="button" className="w-full" onClick={closeAndReset}>
              Fermer
            </Button>
          </div>
        ) : (
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
              <Label>Protocole</Label>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L2TP">L2TP (recommandé)</SelectItem>
                  <SelectItem value="WIREGUARD">WireGuard</SelectItem>
                  <SelectItem value="SSTP">SSTP</SelectItem>
                  <SelectItem value="OVPN">OVPN</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                L2TP est le plus simple sur MikroTik. WireGuard nécessite 3 commandes sur le routeur.
              </p>
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
              {loading ? "Création + provisionnement…" : "Créer et provisionner"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
