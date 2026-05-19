import { getSession } from "@/lib/auth";
import { listDevicesForTenant } from "@/lib/device-service";
import { PageHeader } from "@/components/layout/page-header";
import { DataPanel } from "@/components/shared/data-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MonitoringPage() {
  const session = await getSession();
  if (!session) return null;

  const devices = await listDevicesForTenant(session.tenantId);

  return (
    <>
      <PageHeader title="Monitoring" description="Latence et état des connexions" />
      <DataPanel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Routeur</TableHead>
              <TableHead>Protocole</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-xs">{d.protocol}</TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {d.latencyMs != null ? `${d.latencyMs} ms` : "—"}
                </TableCell>
              </TableRow>
            ))}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                  Aucun device.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataPanel>
    </>
  );
}
