import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import type { AdminRole } from "~/app/admin/_lib/admin-nav";
import { checkBusiness, checkBusinessMembership } from "~/lib/check-business";
import { isPathAllowedForRole } from "~/app/admin/_lib/admin-nav";
import { getPlatformMaintenance } from "~/lib/maintenance";
import { getSession } from "~/server/better-auth/server";
import { api, HydrateClient } from "~/trpc/server";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { MaintenanceScreen } from "~/components/maintenance/maintenance-screen";
import { AdminCommandPalette } from "~/app/admin/_components/admin-command-palette";
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
  let membershipRole: AdminRole | null = null;
  if (session.user.platformRole !== "PLATFORM_ADMIN") {
    // For everyone else, check BusinessMembership
    const membership = await checkBusinessMembership(
      business.id,
      session.user.id,
    );
    if (
      !membership ||
      !["OWNER", "MANAGER", "STAFF"].includes(membership.role)
    ) {
      redirect("/not-permitted");
    }
    membershipRole = membership.role as AdminRole;

    // STAFF is fulfillment-only: orders + customers. Middleware exposes the
    // requested path via x-pathname; anything outside the allowed pages sends
    // staff back to their home page (/admin/orders). This is a UX guard —
    // the real enforcement lives in the tRPC procedures (staffProcedure vs
    // ownerAdminProcedure).
    if (membershipRole === "STAFF") {
      const headersList = await headers();
      const rawPath = headersList.get("x-pathname");
      const pathname = rawPath?.split("?")[0] ?? "";
      if (pathname && !isPathAllowedForRole(pathname, "STAFF")) {
        redirect("/admin/orders");
      }
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
    </HydrateClient>
  );
}
