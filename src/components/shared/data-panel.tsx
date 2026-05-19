import { cn } from "@/lib/utils";

/** Conteneur liste/table compact — style unifié */
export function DataPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
