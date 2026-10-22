import { env } from "~/env";
import { loadSetupGate } from "~/lib/admin/setup-status.server";
import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { resolveOwnerTermsGate } from "~/lib/legal/owner-terms-gate.server";
import { resolvePolicyUpdateNotice } from "~/lib/legal/policy-update-notice.server";
import { getPlatformMaintenance } from "~/lib/maintenance";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { OwnerTermsGateScreen } from "~/components/legal/owner-terms-gate-screen";
import { PolicyUpdateBanner } from "~/components/legal/policy-update-banner";
import { MaintenanceScreen } from "~/components/maintenance/maintenance-screen";
import { NavigationGuardProvider } from "~/providers/navigation-guard-context";
import { AdminCommandPalette } from "~/app/admin/_components/admin-command-palette";
import { AppSidebar } from "~/app/admin/_components/app-sidebar";
import { CloseMobileSidebarOnNavigate } from "~/app/admin/_components/close-mobile-sidebar-on-navigate";
import { PaymentsDisabledBanner } from "~/app/admin/_components/payments-disabled-banner";

type Props = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: Props) {
  const {
    session,
    business,
    membershipRole,
    merchantTermsAcceptedAt,
    merchantTermsVersion,
  } = await requireAdminAccess();

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

  // The sidebar's "Finish setup" nudge. `loadSetupGate` is the same rule
  // /admin/page.tsx redirects on, so the nudge and the /admin redirect agree
  // on whether setup is finished (required steps only, latched once passed).
  // A launched store answers from a few scalar columns — this runs on every
  // admin page — and the result is request-cached for the page below.
  //
  // Runs alongside the pending-review count below — both are single cheap
  // reads needed on every admin page load, so they fire in parallel rather
  // than adding a sequential round trip each.
  const [gate, pendingReviewCount, policyUpdateNotice] = await Promise.all([
    loadSetupGate(business.id),
    // ProductReview has no businessId column — scoped through the product
    // relation, same tenancy rule as review.ts. Counts customer-submitted AND
    // owner-created rows that are unapproved, but owner-created reviews
    // default to `isApproved: true` (see review.ownerCreate), so in practice
    // this is the pending-customer-review queue the sidebar badge is for.
    // Hidden rows are dismissed, not pending, so `isHidden: false` keeps them
    // out of the count (pending = !isApproved && !isHidden).
    db.productReview.count({
      where: {
        isApproved: false,
        isHidden: false,
        product: { businessId: business.id },
      },
    }),
    // Non-blocking "policies are changing" banner for store OWNERS. Only
    // reached when the hard gate above is NOT showing. Resolves to null for
    // every other role, when no material update is announced, when the owner
    // is already covered, and on ANY failure — see `resolvePolicyUpdateNotice`.
    resolvePolicyUpdateNotice({
      membershipRole,
      userId: session.user.id,
      businessId: business.id,
      merchantTermsVersion,
    }),
  ]);

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
          <CloseMobileSidebarOnNavigate />
          <AppSidebar
            variant="inset"
            session={session}
            businessName={businessName}
            featureData={featureData}
            membershipRole={membershipRole}
            setupComplete={gate?.gateComplete ?? false}
            pendingReviewCount={pendingReviewCount}
          />
          <SidebarInset>
            <div className="bg-muted min-h-screen">
              {/* Flush above the page's own TrailHeader on purpose: while
                  charges are disabled nothing else on the screen is more
                  urgent. Renders null in the normal case — and only speaks
                  once Stripe has confirmed the restriction (the DB flag alone
                  is a hint; see `getPaymentsHealth`). Awaited rather than
                  streamed so a real strip never pops in and shoves the page
                  down; the Stripe read is bounded and cached. Hidden from
                  STAFF, who are fulfillment-only and can reach neither Stripe
                  nor settings. */}
              {membershipRole !== "STAFF" && gate && (
                <PaymentsDisabledBanner
                  business={{
                    id: business.id,
                    stripeAccountId: gate.stripeAccountId,
                    // Rides along on the gate query — no extra round trip.
                    stripeChargesEnabled: gate.stripeChargesEnabled,
                  }}
                />
              )}
              {policyUpdateNotice && (
                <PolicyUpdateBanner
                  update={policyUpdateNotice.update}
                  pending={policyUpdateNotice.pending}
                  platformDomain={env.NEXT_PUBLIC_PLATFORM_DOMAIN}
                />
              )}
              {children}
            </div>
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
