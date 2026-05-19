import { Badge } from "@/components/ui/badge";
import type { DeviceStatus } from "@prisma/client";

const labels: Record<DeviceStatus, string> = {
  ONLINE: "En ligne",
  OFFLINE: "Hors ligne",
  PENDING: "En attente",
};

const variants: Record<DeviceStatus, "online" | "offline" | "pending"> = {
  ONLINE: "online",
  OFFLINE: "offline",
  PENDING: "pending",
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
