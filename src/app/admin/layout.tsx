import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { env } from "~/env";
import { resolveOwnerTermsGate } from "~/lib/legal/owner-terms-gate.server";
import { getPlatformMaintenance } from "~/lib/maintenance";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { OwnerTermsGateScreen } from "~/components/legal/owner-terms-gate-screen";
import { MaintenanceScreen } from "~/components/maintenance/maintenance-screen";
import { NavigationGuardProvider } from "~/providers/navigation-guard-context";
import { AdminCommandPalette } from "~/app/admin/_components/admin-command-palette";
import { AppSidebar } from "~/app/admin/_components/app-sidebar";

type Props = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: Props) {
  const { session, business, membershipRole, merchantTermsAcceptedAt } =
    await requireAdminAccess();

  const platformMaintenance = await getPlatformMaintenance();
  if (platformMaintenance.active && !(await isPlatformAdmin(session.user.id))) {
    return (
      <MaintenanceScreen
        variant="maintenance"
        message={platformMaintenance.message}
      />
    );
  }

  // Retroactive terms acceptance. Deliberately AFTER the maintenance check, so
  // platform maintenance still wins, and returned in place of the whole admin
  // chrome exactly like MaintenanceScreen.
  //
  // Fires only for `membershipRole === "OWNER"` with a recorded acceptance of
  // exactly `null`. PLATFORM_ADMIN resolves to `membershipRole: null` and never
  // matches — a platform admin browsing a tenant's admin is not that merchant.
  // MANAGER and STAFF never match either: the merchant agreement is the
  // owner's. Anything unknown or unreadable falls through un-gated; see
  // `resolveOwnerTermsGate`.
  //
  // The interstitial is NOT a hard block: it links every policy (new tab),
  // keeps sign-out reachable, and posts to `legal.acceptOwnerTerms` over
  // `/api/trpc`, which this layout does not wrap — so the way out is always
  // reachable from inside the gate.
  const ownerTermsGate = await resolveOwnerTermsGate({
    membershipRole,
    merchantTermsAcceptedAt,
    userId: session.user.id,
  });
  if (ownerTermsGate) {
    return (
      <OwnerTermsGateScreen
        businessName={business.name}
        includePlatformTerms={ownerTermsGate.includePlatformTerms}
        platformDomain={env.NEXT_PUBLIC_PLATFORM_DOMAIN}
      />
    );
  }

  const businessName = business?.name ?? null;

  const featureData = await api.features.getFlags();

  // Cheap lookup for the sidebar's "Finish setup" nudge — same shape as the
  // setupComplete check in /admin/page.tsx, minus customDomain (a subdomain
  // store with Stripe + a product is a legitimately finished setup).
  const welcomeSetupStatus = await db.business.findUnique({
    where: { id: business.id },
    select: {
      stripeAccountId: true,
      _count: { select: { products: true } },
    },
  });

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
            welcomeSetupStatus={{
              stripeConnected: Boolean(welcomeSetupStatus?.stripeAccountId),
              hasProducts: (welcomeSetupStatus?._count.products ?? 0) > 0,
            }}
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
