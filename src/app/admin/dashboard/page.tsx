import { Suspense } from "react";
import { notFound } from "next/navigation";

import type { WidgetId } from "~/lib/dashboard/widgets";
import { loadSetupStatus } from "~/lib/admin/setup-status.server";
import { checkBusiness } from "~/lib/check-business";
import { toCardDataInput } from "~/lib/dashboard/card-data";
import {
  getWidget,
  resolveWidgetHref,
  WIDGET_IDS,
} from "~/lib/dashboard/widgets";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { DashboardShell } from "~/app/admin/dashboard/_components/dashboard-shell";
import { AttentionStrip } from "~/app/admin/dashboard/_components/pinned/attention-strip";
import { OversellAlert } from "~/app/admin/dashboard/_components/pinned/oversell-alert";
import { SetupProgressCard } from "~/app/admin/dashboard/_components/pinned/setup-progress-card";
import { SearchReadinessStrip } from "~/app/admin/dashboard/_components/search-readiness-strip";

import { TrailHeader } from "../_components/trail-header";

export default async function AdminDashboardPage() {
  const business = await checkBusiness();

  if (!business) {
    notFound();
  }

  const flags = await getBusinessFlags();

  // Card links that depend on this store's flags (low stock → Inventory when
  // Products is off). Only the ones that differ from the registry are sent.
  const widgetHrefs: Partial<Record<WidgetId, string>> = {};
  for (const id of WIDGET_IDS) {
    const def = getWidget(id);
    const href = resolveWidgetHref(def, flags.isEnabled);
    if (href !== def.href) widgetHrefs[id] = href;
  }

  // The card layout, then one fire-and-forget prefetch per visible card as
  // soon as it resolves. The prefetches are NOT awaited: pending queries are
  // dehydrated and finish on the client's stream, so each card streams in
  // behind its own Suspense boundary. `toCardDataInput` is the only builder of
  // the input — the client's `useCardData` uses it too, so both sides hit the
  // same cache key.
  const layoutPromise = api.dashboard.getLayout().then((layout) => {
    for (const card of layout.visibleCards) {
      void api.dashboard.cardData.prefetch(toCardDataInput(card));
    }
    return layout;
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Everything below is independent of the layout and of each other, so it
  // all runs in one round of parallel queries.
  const businessDataPromise = db.business.findUnique({
    where: { id: business.id },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  // Feeds the search-readiness strip (the six meta columns, scored by
  // `computeSeoScorecard`). The "Finish setting up" card reads its own
  // siteContent bits through `loadSetupStatus` below.
  //
  // `pageMeta` and `siteVerification` MUST stay in this select. /admin/content/seo
  // loads siteContent via `business.getWith({ includeSiteContent: true })` (a
  // Prisma `include:`, so it gets every column automatically); this page uses an
  // explicit `select:` instead, so a column added to the scorecard has to be
  // added here by hand or it scores as permanently missing here while scoring
  // correctly on the SEO page — two different percentages for the same store.
  const siteContentPromise = db.siteContent.findUnique({
    where: { businessId: business.id },
    select: {
      logoUrl: true,
      customFields: true,
      metaTitle: true,
      metaDescription: true,
      seoBrandName: true,
      ogImage: true,
      faviconUrl: true,
      pageMeta: true,
      siteVerification: true,
    },
  });

  // Only the data behind the pinned strips is fetched here; every metric card
  // loads through `dashboard.cardData`.
  const [
    layout,
    businessData,
    siteContentForSetup,
    setup,
    recentOversells,
    ordersToFulfillCount,
    awaitingPaymentCount,
  ] = await Promise.all([
    layoutPromise,
    businessDataPromise,
    siteContentPromise,

    // The "Finish setting up" card — the same checklist /admin/welcome renders
    // in full, and (via `facts.policiesLive`) the attention strip's missing
    // policies nudge. Request-cached: while a store is still in setup, the
    // layout's gate check reuses this same read.
    loadSetupStatus(business.id),

    // Recent oversells (last 30 days)
    db.inventoryHistory.findMany({
      where: {
        businessId: business.id,
        reason: "oversell",
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Orders needing fulfillment. Must match the strip's link filter exactly
    // (/admin/orders?status=open&fulfillment=unfulfilled&paymentStatus=paid),
    // so the number equals the rows the link opens. Partially fulfilled orders
    // are deliberately excluded; they get their own row badge on the Orders
    // page instead. Same decision as the Orders page's "Needs fulfillment" card.
    db.order.count({
      where: {
        businessId: business.id,
        status: "open",
        paymentStatus: "paid",
        fulfillmentStatus: "unfulfilled",
      },
    }),

    // Orders awaiting payment (pending, not cancelled/refunded)
    db.order.count({
      where: {
        businessId: business.id,
        paymentStatus: "pending",
        status: { notIn: ["cancelled", "refunded"] },
      },
    }),
  ]);

  // Nudge (not a gate): true when either required policy page is missing,
  // unpublished, or empty — whether or not this store's plan shows the
  // `policiesLive` setup step. Shared rule: `areRequiredPoliciesLive`.
  const missingPolicies = setup ? !setup.facts.policiesLive : false;

  // `progress` is null once every visible step is done, which is what hides
  // the "Finish setting up" card.
  const setupProgress = setup?.status.progress ?? null;

  return (
    <HydrateClient>
      <TrailHeader breadcrumbs={[]} />

      {!flags.isEnabled("cart") && (
        <Alert className="mx-auto my-4 w-full max-w-5xl">
          <AlertTitle>Cart is disabled</AlertTitle>
          <AlertDescription>
            The cart feature is disabled for this business. Please enable it in
            the settings to use the dashboard. You can enable it in the settings
            to allow customers to add products to their cart and checkout.
          </AlertDescription>
        </Alert>
      )}
      <DashboardShell
        business={{
          name: businessData!.name,
          subdomain: businessData!.subdomain,
          customDomain: businessData!.customDomain,
        }}
        quickActions={{
          addProduct: flags.isEnabled("products"),
          newOrder: flags.isEnabled("orders"),
        }}
        initialCards={layout.visibleCards}
        canEdit={layout.canEdit}
        availableWidgetIds={layout.availableWidgetIds}
        hiddenCount={layout.hiddenCards.length}
        widgetHrefs={widgetHrefs}
        pinned={{
          setup: <SetupProgressCard setupProgress={setupProgress} />,
          searchReadiness:
            // Owner-toggleable under Settings → Features (dashboardSearchReadiness);
            // gated here rather than inside the strip so the scorecard queries don't run.
            businessData && flags.isEnabled("dashboardSearchReadiness") ? (
              <Suspense fallback={null}>
                <SearchReadinessStrip
                  businessId={business.id}
                  isEnabled={flags.isEnabled}
                  business={businessData}
                  siteContent={siteContentForSetup}
                />
              </Suspense>
            ) : undefined,
          attention: (
            <AttentionStrip
              ordersToFulfillCount={ordersToFulfillCount}
              awaitingPaymentCount={awaitingPaymentCount}
              missingPolicies={missingPolicies}
            />
          ),
          oversell: <OversellAlert oversells={recentOversells} />,
        }}
      />
    </HydrateClient>
  );
}

export const metadata = {
  title: "Dashboard",
};
