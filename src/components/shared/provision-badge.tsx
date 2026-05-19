import { Badge } from "@/components/ui/badge";
import type { ProvisionStatus } from "@prisma/client";

const labels: Record<ProvisionStatus, string> = {
  PENDING: "En attente",
  PROVISIONING: "Provisionnement…",
  ACTIVE: "Provisionné",
  FAILED: "Échec",
  DEPROVISIONING: "Suppression…",
  DEPROVISIONED: "Supprimé",
};

const variants: Record<ProvisionStatus, "pending" | "online" | "offline" | "secondary"> = {
  PENDING: "pending",
  PROVISIONING: "pending",
  ACTIVE: "online",
  FAILED: "offline",
  DEPROVISIONING: "pending",
  DEPROVISIONED: "secondary",
};

export function ProvisionBadge({ status }: { status: ProvisionStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
