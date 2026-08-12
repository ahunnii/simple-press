import { Suspense } from "react";
import { notFound } from "next/navigation";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { checkBusiness } from "~/lib/check-business";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { isContentEmpty } from "~/lib/template-fields";
import { db } from "~/server/db";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ConversionCard } from "~/app/admin/dashboard/_components/conversion-card";
import { DashboardContent } from "~/app/admin/dashboard/_components/dashboard-content";
import { bucketRevenueByDay } from "~/app/admin/dashboard/_lib/revenue-by-day";

import { TrailHeader } from "../_components/trail-header";

export default async function AdminDashboardPage() {
  const business = await checkBusiness();

  if (!business) {
    notFound();
  }

  const flags = await getBusinessFlags();

  const businessData = await db.business.findUnique({
    where: { id: business.id },
    include: {
      _count: {
        select: {
          products: true,
          orders: true,
          customers: true,
        },
      },
    },
  });

  // Cheap lookup for the "Finish setting up" card — mirrors the completion
  // logic in /admin/welcome/page.tsx (same 5 setup steps).
  const siteContentForSetup = await db.siteContent.findUnique({
    where: { businessId: business.id },
    select: { logoUrl: true, customFields: true },
  });

  // Get stats for the dashboard
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Prior-period windows for period-over-period deltas:
  // days 14–8 (vs last 7) and days 60–31 (vs last 30).
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // The revenue chart labels whole calendar days, so its window starts at
  // local midnight — otherwise the first bar would silently cover a partial
  // day. Other 30-day stats keep the rolling `thirtyDaysAgo` window.
  const chartWindowStart = new Date(thirtyDaysAgo);
  chartWindowStart.setHours(0, 0, 0, 0);

  const [
    totalRevenue,
    totalOrders,
    recentOrders,
    lowStockProducts,
    lowStockPools,
    revenueOrders,
    recentOversells,
    topProducts,
    ordersToFulfillCount,
    awaitingPaymentCount,
    todayRevenue,
    sevenDayRevenue,
    sevenDayOrders,
    thirtyDayRevenue,
    thirtyDayPaidOrders,
    prevSevenDayRevenue,
    prevSevenDayOrders,
    prevThirtyDayRevenue,
    prevThirtyDayPaidOrders,
    requiredPolicyPages,
  ] = await Promise.all([
    // Total revenue (all time, paid orders that are not fully refunded)
    // Subtract refundAmountCents from partial-refund orders so the stat
    // matches what the orders list page reports.
    db.order.aggregate({
      where: {
        businessId: business.id,
        paymentStatus: "paid",
      },
      _sum: {
        total: true,
        refundAmountCents: true,
      },
    }),

    // Total orders count
    db.order.count({
      where: {
        businessId: business.id,
      },
    }),

    // Recent orders (last 6). Kept short deliberately: this card is a glance,
    // not a browsing surface — "View All" goes to /admin/orders. If you change
    // this, match the skeleton row count in `loading.tsx` so the page doesn't
    // shift when the data lands.
    db.order.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),

    // Low stock products — variants first, then base products without variants.
    Promise.all([
      db.productVariant.findMany({
        where: {
          product: {
            businessId: business.id,
            published: true,
            trackInventory: true,
          },
          inventoryQty: { lte: 10, gte: 0 },
        },
        orderBy: { inventoryQty: "asc" },
        take: 10,
        include: { product: { select: { name: true } } },
      }),
      db.product.findMany({
        where: {
          businessId: business.id,
          published: true,
          trackInventory: true,
          inventoryQty: { lte: 10, gte: 0 },
          variants: { none: {} },
        },
        orderBy: { inventoryQty: "asc" },
        take: 10,
        select: { id: true, name: true, inventoryQty: true },
      }),
    ]).then(([variants, baseProducts]) => {
      const baseAsVariants = baseProducts.map((p) => ({
        id: p.id,
        name: "",
        inventoryQty: p.inventoryQty,
        product: { name: p.name },
      }));
      return [...variants, ...baseAsVariants]
        .sort((a, b) => a.inventoryQty - b.inventoryQty)
        .slice(0, 5);
    }),

    // Low stock pools — pools with inventory at or near zero
    db.baseInventoryUnit.findMany({
      where: {
        businessId: business.id,
        inventoryQty: { lte: 10 },
      },
      orderBy: { inventoryQty: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        inventoryQty: true,
        lowInventoryThreshold: true,
      },
    }),

    // Revenue by day (last 30 days) — raw rows, bucketed into local
    // calendar days below (Prisma's groupBy(["createdAt"]) groups by the
    // full timestamp, i.e. one row per order, not per day).
    //
    // Scoped to paymentStatus: { in: ["paid", "refunded"] } to match the
    // "Revenue (Last 30 Days)" card's headline number (stats.thirtyDayGrossRevenue,
    // computed below from the same paid+refunded scoping). Both must share one
    // definition of "revenue" — previously this query used paymentStatus: "paid"
    // only, so the chart's bars summed to less than the headline once an order
    // in the window was refunded. Gross (not net) was chosen as the shared
    // definition since the card already surfaces the refunded amount and net
    // total as a subtitle line, and the per-day bars have no room to show a
    // refund breakdown of their own.
    db.order.findMany({
      where: {
        businessId: business.id,
        paymentStatus: { in: ["paid", "refunded"] },
        createdAt: {
          gte: chartWindowStart,
        },
      },
      select: {
        createdAt: true,
        total: true,
      },
    }),

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

    // Top products by revenue (last 30 days)
    db.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          businessId: business.id,
          paymentStatus: "paid",
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        productId: {
          not: null,
        },
      },

      _sum: {
        total: true,
        quantity: true,
      },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 5,
    }),

    // Orders needing fulfillment (paid, not yet fully fulfilled, not cancelled/refunded)
    db.order.count({
      where: {
        businessId: business.id,
        paymentStatus: "paid",
        fulfillmentStatus: { in: ["unfulfilled", "partially_fulfilled"] },
        status: { notIn: ["cancelled", "refunded"] },
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

    // Today's revenue (paid orders created since midnight)
    db.order.aggregate({
      where: {
        businessId: business.id,
        paymentStatus: "paid",
        createdAt: { gte: todayStart },
      },
      _sum: { total: true, refundAmountCents: true },
    }),

    // Last 7 days revenue.
    // Includes fully-refunded orders ("refunded" status) so the gross and
    // refunded components are complete; net (total − refundAmountCents) is
    // unchanged because full refunds store refundAmountCents = total.
    db.order.aggregate({
      where: {
        businessId: business.id,
        paymentStatus: { in: ["paid", "refunded"] },
        createdAt: { gte: sevenDaysAgo },
      },
      _sum: { total: true, refundAmountCents: true },
    }),

    // Last 7 days total order count
    db.order.count({
      where: {
        businessId: business.id,
        createdAt: { gte: sevenDaysAgo },
      },
    }),

    // Last 30 days revenue (gross / refunded / net; net feeds the AOV
    // numerator). Same paid+refunded scoping rationale as the 7-day query.
    db.order.aggregate({
      where: {
        businessId: business.id,
        paymentStatus: { in: ["paid", "refunded"] },
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { total: true, refundAmountCents: true },
    }),

    // Last 30 days paid order count (for AOV denominator)
    db.order.count({
      where: {
        businessId: business.id,
        paymentStatus: "paid",
        createdAt: { gte: thirtyDaysAgo },
      },
    }),

    // Prior 7-day window revenue (days 14–8) for the period-over-period delta
    db.order.aggregate({
      where: {
        businessId: business.id,
        paymentStatus: { in: ["paid", "refunded"] },
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
      _sum: { total: true, refundAmountCents: true },
    }),

    // Prior 7-day window total order count
    db.order.count({
      where: {
        businessId: business.id,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),

    // Prior 30-day window revenue (days 60–31) for delta + prior AOV numerator
    db.order.aggregate({
      where: {
        businessId: business.id,
        paymentStatus: { in: ["paid", "refunded"] },
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _sum: { total: true, refundAmountCents: true },
    }),

    // Prior 30-day window paid order count (prior AOV denominator)
    db.order.count({
      where: {
        businessId: business.id,
        paymentStatus: "paid",
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),

    // Terms of Service + Refund Policy pages — the two documents checkout
    // will soon reference ("you agree to this store's Terms of Service").
    // Fetched regardless of `published` so the emptiness/publish check below
    // can tell "never written" apart from "written, not published".
    db.page.findMany({
      where: {
        businessId: business.id,
        type: "policy",
        slug: { in: ["terms-of-service", "refund-policy"] },
      },
      select: { slug: true, published: true, content: true },
    }),
  ]);

  // Bucket raw revenue rows into one total per local calendar day, filling
  // zero-revenue days so the chart axis is continuous.
  const revenueByDay = bucketRevenueByDay(
    revenueOrders,
    chartWindowStart,
    todayStart,
  );

  // Get product details for top products
  const topProductIds = topProducts
    .map((item) => item.productId)
    .filter((id): id is string => id !== null);

  const productDetails = await db.product.findMany({
    where: {
      id: { in: topProductIds },
    },
    select: {
      id: true,
      name: true,
      images: {
        take: 1,
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  // Gross / refunded / net breakdowns for the trailing windows. The cards
  // display gross with a "− $X refunded" line; deltas compare net to net so
  // trends stay honest when refunds land.
  const sevenDayGross = sevenDayRevenue._sum.total ?? 0;
  const sevenDayRefunded = sevenDayRevenue._sum.refundAmountCents ?? 0;
  const thirtyDayGross = thirtyDayRevenue._sum.total ?? 0;
  const thirtyDayRefunded = thirtyDayRevenue._sum.refundAmountCents ?? 0;

  const prevSevenDayNet =
    (prevSevenDayRevenue._sum.total ?? 0) -
    (prevSevenDayRevenue._sum.refundAmountCents ?? 0);
  const prevThirtyDayNet =
    (prevThirtyDayRevenue._sum.total ?? 0) -
    (prevThirtyDayRevenue._sum.refundAmountCents ?? 0);

  // Conversion card renders only when analytics is fully configured for this
  // business; it streams in behind its own Suspense boundary so Umami latency
  // (or an outage) never blocks the dashboard.
  const umamiWebsiteId = businessData?.umamiWebsiteId ?? null;
  const showConversionCard =
    flags.isEnabled("analytics") &&
    !!businessData?.umamiEnabled &&
    umamiWebsiteId !== null;

  const topProductsWithDetails = topProducts.map((item) => {
    const product = productDetails.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      productName: product?.name ?? "Unknown Product",
      imageUrl: product?.images[0]?.url ?? null,
      revenue: item._sum.total ?? 0,
      unitsSold: item._sum.quantity ?? 0,
    };
  });

  // Nudge (not a gate): true when either required policy page is missing,
  // unpublished, or empty. Mirrors the "no live policies" check on
  // /admin/content/policies (missingRequiredPolicies in policies-manager.tsx).
  const isPolicyLive = (slug: string) =>
    requiredPolicyPages.some(
      (p) =>
        p.slug === slug &&
        p.published &&
        !isContentEmpty(p.content as TiptapJSON),
    );
  const missingPolicies =
    !isPolicyLive("terms-of-service") || !isPolicyLive("refund-policy");

  // "Finish setting up" card — mirrors the 5-step completion logic in
  // /admin/welcome/page.tsx (businessCreated is always true post-onboarding).
  const setupCustomFields = siteContentForSetup?.customFields;
  const storefrontCustomized =
    Boolean(siteContentForSetup?.logoUrl) ||
    (setupCustomFields !== null &&
      setupCustomFields !== undefined &&
      typeof setupCustomFields === "object" &&
      !Array.isArray(setupCustomFields) &&
      Object.keys(setupCustomFields as Record<string, unknown>).length > 0);

  const setupSteps: Array<{ done: boolean; label: string; href: string }> = [
    { done: true, label: "Store created", href: "/admin/welcome" },
    {
      done: Boolean(businessData?.stripeAccountId),
      label: "Connect payment processing",
      href: "/admin/welcome",
    },
    {
      done: Boolean(businessData?.customDomain),
      label: "Connect a custom domain",
      href: "/admin/welcome",
    },
    {
      done: (businessData?._count.products ?? 0) > 0,
      label: "Add your first product",
      href: "/admin/products/new",
    },
    {
      done: storefrontCustomized,
      label: "Customize your storefront",
      href: "/editor",
    },
  ];
  const setupCompletedSteps = setupSteps.filter((s) => s.done).length;
  const setupTotalSteps = setupSteps.length;
  const nextSetupStep = setupSteps.find((s) => !s.done) ?? null;
  const setupProgress =
    setupCompletedSteps === setupTotalSteps
      ? null
      : {
          completed: setupCompletedSteps,
          total: setupTotalSteps,
          nextStep: nextSetupStep
            ? { label: nextSetupStep.label, href: nextSetupStep.href }
            : null,
        };

  return (
    <>
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
      <DashboardContent
        business={businessData!}
        setupProgress={setupProgress}
        stats={{
          totalRevenue:
            (totalRevenue._sum.total ?? 0) -
            (totalRevenue._sum.refundAmountCents ?? 0),
          totalOrders,
          totalProducts: businessData!._count.products,
          totalCustomers: businessData!._count.customers,
          todayRevenue:
            (todayRevenue._sum.total ?? 0) -
            (todayRevenue._sum.refundAmountCents ?? 0),
          sevenDayRevenue: sevenDayGross - sevenDayRefunded,
          sevenDayGrossRevenue: sevenDayGross,
          sevenDayRefunded,
          prevSevenDayRevenue: prevSevenDayNet,
          sevenDayOrders,
          prevSevenDayOrders,
          thirtyDayRevenue: thirtyDayGross - thirtyDayRefunded,
          thirtyDayGrossRevenue: thirtyDayGross,
          thirtyDayRefunded,
          prevThirtyDayRevenue: prevThirtyDayNet,
          thirtyDayPaidOrders,
          prevThirtyDayPaidOrders,
        }}
        conversionCard={
          showConversionCard && umamiWebsiteId ? (
            <Suspense fallback={null}>
              <ConversionCard
                websiteId={umamiWebsiteId}
                paidOrders={thirtyDayPaidOrders}
              />
            </Suspense>
          ) : undefined
        }
        ordersToFulfillCount={ordersToFulfillCount}
        awaitingPaymentCount={awaitingPaymentCount}
        missingPolicies={missingPolicies}
        recentOrders={
          recentOrders as Array<{
            id: string;
            orderNumber: number;
            customerName: string;
            total: number;
            status: string;
            createdAt: Date;
          }>
        }
        lowStockProducts={lowStockProducts}
        lowStockPools={lowStockPools}
        recentOversells={recentOversells}
        revenueByDay={revenueByDay}
        topProducts={topProductsWithDetails}
      />
    </>
  );
}

export const metadata = {
  title: "Dashboard",
};
