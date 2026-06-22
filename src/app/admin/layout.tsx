import { notFound, redirect } from "next/navigation";

import { checkBusiness, checkBusinessMembership } from "~/lib/check-business";
import { getPlatformMaintenance } from "~/lib/maintenance";
import { getSession } from "~/server/better-auth/server";
import { api, HydrateClient } from "~/trpc/server";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { MaintenanceScreen } from "~/components/maintenance/maintenance-screen";
import { AppSidebar } from "~/app/admin/_components/app-sidebar";

type Props = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: Props) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }

  const business = await checkBusiness();

  if (!business) {
    notFound();
  }

  // Allow PLATFORM_ADMIN unconditionally
  if (session.user.platformRole !== "PLATFORM_ADMIN") {
    // For everyone else, check BusinessMembership
    const membership = await checkBusinessMembership(
      business.id,
      session.user.id,
    );
    if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
      redirect("/not-permitted");
    }
  }

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
        />
        <SidebarInset>
          <div className="min-h-screen bg-muted">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </HydrateClient>
  );
}
