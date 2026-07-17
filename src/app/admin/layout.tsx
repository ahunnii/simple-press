import { getPlatformMaintenance } from "~/lib/maintenance";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { api, HydrateClient } from "~/trpc/server";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { MaintenanceScreen } from "~/components/maintenance/maintenance-screen";
import { NavigationGuardProvider } from "~/providers/navigation-guard-context";
import { AdminCommandPalette } from "~/app/admin/_components/admin-command-palette";
import { AppSidebar } from "~/app/admin/_components/app-sidebar";

type Props = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: Props) {
  const { session, business, membershipRole } = await requireAdminAccess();

  const platformMaintenance = await getPlatformMaintenance();
  if (
    platformMaintenance.active &&
    session.user.platformRole !== "PLATFORM_ADMIN"
  ) {
    return (
      <MaintenanceScreen
        variant="maintenance"
        message={platformMaintenance.message}
      />
    );
  }

  const businessName = business?.name ?? null;

  const featureData = await api.features.getFlags();

  return (
    <HydrateClient>
      <NavigationGuardProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar
            variant="inset"
            session={session}
            businessName={businessName}
            featureData={featureData}
            membershipRole={membershipRole}
          />
          <SidebarInset>
            <div className="bg-muted min-h-screen">{children}</div>
          </SidebarInset>
          <AdminCommandPalette
            session={session}
            featureData={featureData}
            membershipRole={membershipRole}
          />
        </SidebarProvider>
      </NavigationGuardProvider>
    </HydrateClient>
  );
}
