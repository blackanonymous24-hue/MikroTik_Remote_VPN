import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 lg:ml-60">
        <div className="min-h-svh px-3 pb-6 pt-14 sm:px-6 sm:pt-6">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}
