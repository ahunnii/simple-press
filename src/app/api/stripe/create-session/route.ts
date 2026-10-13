import type { Prisma } from "generated/prisma";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import type {
  ConfiguredLine,
  StockPoolRow,
  StockProductRow,
  StockRows,
  StockVariantRow,
  StoredLineConfigs,
} from "~/lib/checkout/customizer-checkout";
import type { CartAvailabilityResult } from "~/lib/checkout/validate-cart";
import type { CustomizerDefinition } from "~/lib/customizer/types";
import type { SupportedCountry } from "~/lib/geo/regions";
import type { ReservationEntry } from "~/lib/inventory/reservation";
import { env } from "~/env";
import {
  appendHold,
  buildLineDemands,
  evaluateCheckoutCustomizations,
  findOverdrawnLines,
  holdForTarget,
  isConfiguredLine,
  LINE_CONFIG_METADATA_KEY,
  OPTIONS_SUMMARY_METADATA_KEY,
  STRIPE_DESCRIPTION_MAX,
  STRIPE_OPTIONS_SUMMARY_MAX,
  truncateUtf16,
} from "~/lib/checkout/customizer-checkout";
import {
  discountUsageForCheckout,
  supersedePendingCheckout,
} from "~/lib/checkout/discount-holds";
import {
  PENDING_COOKIE_MARKER_KEY,
  PENDING_COOKIE_MARKER_VALUE,
  PENDING_SESSION_COOKIE,
  PENDING_SESSION_COOKIE_MAX_AGE,
  signPendingSessionCookie,
} from "~/lib/checkout/pending-session-cookie";
import { computeSubtotalCents } from "~/lib/checkout/pricing";
import { shouldPinPaymentIntentShipping } from "~/lib/checkout/shipping";
import {
  checkCartAvailability,
  computePoolDemand,
  isOwnerFaultReason,
  isScarcityReason,
  pushUnavailableLine,
} from "~/lib/checkout/validate-cart";
import {
  loadCustomizerDefinitions,
  PRODUCT_OPTIONS_FEATURE_KEY,
} from "~/lib/customizer/load";
import { validateAndComputeDiscount } from "~/lib/discount-validation";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { getAllowedCountries } from "~/lib/geo/regions";
import { rasterImageUrl } from "~/lib/image-url";
import {
  releaseReservation,
  reserveInventory,
  sweepStaleReservations,
} from "~/lib/inventory/reservation";
import { getPlatformMaintenance } from "~/lib/maintenance";
import { checkoutLimiter, getClientIp } from "~/lib/rate-limit";
import {
  buildZoneWeightConfig,
  reportZoneWeightFallback,
} from "~/lib/shipping-config";
import {
  calculateShipping,
  calculateZoneWeightShipping,
  normalizeWeightToLb,
  SHIPPING_TYPES,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { stripeClient } from "~/lib/stripe/client";
import { normalizeEmail } from "~/lib/utils";
import { checkoutSessionSchema } from "~/lib/validators/checkout";
import { resolveVariantPrice } from "~/lib/variant-price";
import { db } from "~/server/db";

// Thrown inside the reservation transaction to force a rollback when stock
// can't be held; caught by the POST handler to return a 400. Throwing (rather
// than returning) is required so Prisma rolls back any partial reservedQty
// increments made earlier in the reserve loop.
class OutOfStockError extends Error {}

// Same rollback mechanism as OutOfStockError, for a discount entry that could
// not claim a use: another open checkout (or order) took the code's last use
// between validation and the reservation transaction.
class DiscountExhaustedError extends Error {}

// ─────────────────────────────────────────────────────────────────────────────
// Owner-fault checkout blocks → Sentry
// ─────────────────────────────────────────────────────────────────────────────
//
// Most rejection branches in this handler are store misconfiguration, not
// shopper error: Stripe was never connected, a commerce feature flag is off, the
// template posts a cart shape the schema rejects, the storefront still links a
// product that was unpublished or deleted. In every one of those the store takes
// ZERO orders, the shopper sees a generic message and leaves, and nobody finds
// out until the owner notices sales stopped days later. These branches all
// `return` before the try/catch, so none of them ever reached Sentry.
//
// Why throttle: a broken store rejects EVERY shopper. Unthrottled, this bills
// one event per checkout attempt for as long as the store stays broken — on a
// busy store thousands of events that Sentry would fold into the single issue it
// was always going to show us. The signal we act on is "checkout is blocked for
// this store, for this reason", not the exact number of shoppers who hit it. One
// event per store+reason per 15 minutes keeps the issue open and its `lastSeen`
// honest (so it re-surfaces as long as the store is still broken) while capping
// the bill. Throttle state is per server process — with several instances the
// worst case is a few duplicate events per window, which is fine.
const CHECKOUT_BLOCK_WINDOW_MS = 15 * 60 * 1000;

// Bounded by (stores served by this process × block reasons), so it is small in
// practice — but this module lives for the life of the process, so it gets a
// hard cap anyway. Cleared wholesale rather than evicting the oldest entry: the
// only consequence of losing the map is at most one extra event per key, which
// is not worth the bookkeeping of an LRU.
const MAX_TRACKED_BLOCKS = 500;
const lastBlockReport = new Map<string, number>();

function reportCheckoutBlocked(
  reason: string,
  ctx: {
    businessId?: string;
    templateId?: string;
    /**
     * Throttle identity for branches that run BEFORE tenant resolution (the zod
     * parse). Without it, every store's malformed-body reports would share one
     * global bucket and the first broken store would silence all the others for
     * the whole window. Not sent as a tag — pass it in `extra` when it matters.
     */
    host?: string;
    extra?: Record<string, unknown>;
  },
): void {
  const key = `${ctx.businessId ?? ctx.host ?? "unknown"}:${reason}`;
  const now = Date.now();
  if (now - (lastBlockReport.get(key) ?? 0) < CHECKOUT_BLOCK_WINDOW_MS) return;
  if (lastBlockReport.size >= MAX_TRACKED_BLOCKS) lastBlockReport.clear();
  lastBlockReport.set(key, now);

  Sentry.captureMessage(`Checkout blocked: ${reason}`, {
    level: "error",
    tags: {
      route: "stripe.create-session",
      "checkout.block": reason,
      "checkout.fault": "owner",
      ...(ctx.businessId ? { businessId: ctx.businessId } : {}),
      ...(ctx.templateId ? { templateId: ctx.templateId } : {}),
    },
    extra: ctx.extra,
  });
}

// Address fields this route requires for a `ship` order. Used only to name the
// blank ones in the Sentry report — never their values (PII).
const REQUIRED_SHIPPING_FIELDS = [
  "line1",
  "city",
  "state",
  "postalCode",
] as const;

// Helper function to create a one-time Stripe coupon for the discount
async function createStripeCoupon(
  stripe: Stripe,
  stripeAccountId: string,
  amountOff: number,
): Promise<string> {
  const coupon = await stripe.coupons.create(
    {
      amount_off: amountOff,
      currency: "usd",
      duration: "once",
      name: "Discount Code",
    },
    {
      stripeAccount: stripeAccountId,
    },
  );
  return coupon.id;
}

export async function POST(req: NextRequest) {
  // Diagnostic snapshot for the outer catch. `business`, the cart and
  // `deliveryMethod` are all resolved INSIDE the try block, so they are out of
  // scope where a 500 is reported; this fills in as each becomes known and is
  // attached verbatim to the Sentry event. Read by nothing else — it never
  // influences a response.
  const errorContext: Record<string, unknown> = {};

  try {
    // Throttle BEFORE reading/parsing the body: `getClientIp` only reads
    // headers, so an unauthenticated caller is rejected before we ever buffer
    // or JSON-parse an arbitrarily large request body.
    try {
      await checkoutLimiter.consume(getClientIp(req));
    } catch {
      // Deliberately NOT reported: a 429 is the limiter working as designed.
      // It is per-IP shopper traffic, never a symptom of a broken store, and
      // capturing it would generate exactly the flood the limiter exists to
      // absorb.
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const parsed = checkoutSessionSchema.safeParse(await req.json());
    if (!parsed.success) {
      // The highest-value report in this handler. `parsed.error` is otherwise
      // discarded and the shopper gets a bare "Invalid request.", so a template
      // that posts a malformed cart (drops `variantName`, sends `price` as a
      // string, omits `quantity`) takes the store to zero conversions with no
      // trace anywhere. `flatten()` names the exact field that is wrong, which
      // is usually the entire diagnosis.
      //
      // Tenant isn't resolved yet — the parse must stay ahead of the business
      // lookup so we never query on an unvalidated body — so the request host
      // stands in as the store identity, for throttling and for triage.
      const host = req.headers.get("host");
      reportCheckoutBlocked("invalid-request-body", {
        host: host ?? undefined,
        extra: {
          host,
          // Field names + zod's own messages only. `flatten()` does not include
          // the submitted values, which carry the shopper's email/name/address
          // (`sendDefaultPii` is false and must stay that way).
          issues: parsed.error.flatten(),
        },
      });
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const body = parsed.data;
    const { items, customerInfo, discountCodeId } = body;
    errorContext.cartItemCount = items.length;

    const domain = getCurrentDomain(req.headers);
    const business = await getBusinessByDomain(domain);

    // // Get business with Stripe account
    // const business = await db.business.findUnique({
    //   where: { id: businessId },
    //   select: {
    //     stripeAccountId: true,
    //     name: true,
    //     subdomain: true,
    //     customDomain: true,
    //   },
    // });

    if (!business) {
      // Null means an unknown host OR a suspended/closed store
      // (`getBusinessByDomain` is active-only) — e.g. a shopper whose cart was
      // still open when the store was suspended.
      reportCheckoutBlocked("business-not-found", {
        host: domain,
        extra: { host: domain },
      });
      return NextResponse.json(
        { error: "Checkout is not available for this store." },
        { status: 404 },
      );
    }

    if (!business.stripeAccountId) {
      // The store cannot take a single order until Connect onboarding finishes.
      // Owners routinely believe they are live because the storefront renders
      // and the cart works — this branch is the proof that it doesn't.
      reportCheckoutBlocked("stripe-not-connected", {
        businessId: business.id,
        templateId: business.templateId,
        host: domain,
        extra: {
          host: domain,
          hasStripeAccountId: false,
          stripeChargesEnabled: business.stripeChargesEnabled,
        },
      });
      return NextResponse.json(
        { error: "Store payment processing not configured" },
        { status: 400 },
      );
    }

    errorContext.businessId = business.id;
    errorContext.templateId = business.templateId;
    errorContext.stripeAccountId = business.stripeAccountId;
    errorContext.stripeChargesEnabled = business.stripeChargesEnabled;
    errorContext.stripeAutoTaxEnabled = business.stripeAutoTaxEnabled;

    // Feature-flag guard: disabling checkout/cart/payments must actually close
    // the money endpoint, not just hide the storefront UI (which is bypassable
    // by POSTing here directly). Resolve the store's flags and reject session
    // creation if any of the required commerce flags are off. `coupons` is
    // handled separately below (discounts are ignored, not fatal).
    const { isEnabled: isFeatureEnabled, disabledByDependency } = resolveFlags(
      business.featureFlags,
    );
    if (
      !isFeatureEnabled("cart") ||
      !isFeatureEnabled("checkout") ||
      !isFeatureEnabled("payments")
    ) {
      // Nearly always unintentional. `checkout` depends on `products`+`cart` and
      // `payments` on `orders`+`cart`, so switching off a PARENT feature
      // silently cascades the money endpoint closed — the admin UI shows the
      // parent toggled off, not "you have stopped taking orders".
      // `viaDependencyCascade` separates that accident from a deliberate "we are
      // not selling right now", which is the only reading that needs no action.
      const disabledFlags = (["cart", "checkout", "payments"] as const).filter(
        (flag) => !isFeatureEnabled(flag),
      );
      reportCheckoutBlocked("feature-disabled", {
        businessId: business.id,
        templateId: business.templateId,
        extra: {
          disabledFlags,
          viaDependencyCascade: disabledFlags.some((flag) =>
            disabledByDependency.includes(flag),
          ),
          disabledByDependency,
        },
      });
      return NextResponse.json(
        { error: "Checkout is not available for this store." },
        { status: 403 },
      );
    }
    const couponsEnabled = isFeatureEnabled("coupons");
    // Product customizer. Off: any posted build is rejected
    // (`configuration-invalid`) and products sell as plain lines.
    const optionsEnabled = isFeatureEnabled(PRODUCT_OPTIONS_FEATURE_KEY);

    // Maintenance guard: reject checkout while platform or store is in maintenance.
    const platformMaintenance = await getPlatformMaintenance();
    if (platformMaintenance.active || business.maintenanceMode) {
      // Only the BUSINESS-scoped case is reported. Platform-wide maintenance is
      // us — we already know we flipped it, and reporting it would fire once per
      // store on the platform for a condition that has a single cause.
      // A single store left in maintenance/coming-soon is the interesting one:
      // it is usually a leftover from a template edit or a launch that was never
      // flipped back, and the store takes zero orders for the entire time. It
      // can be intentional, which is exactly why it is throttled rather than
      // suppressed — one event per 15 minutes is a cheap standing reminder.
      if (!platformMaintenance.active) {
        reportCheckoutBlocked("store-maintenance", {
          businessId: business.id,
          templateId: business.templateId,
          extra: {
            trigger: "business",
            platformMaintenanceActive: false,
            businessMaintenanceMode: business.maintenanceMode,
            maintenanceVariant: business.maintenanceVariant,
          },
        });
      }
      return NextResponse.json(
        {
          error:
            "This store is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    // Lazy sweeper: release any stale reservations for this business before
    // running availability checks so they don't inflate reservedQty.
    try {
      await sweepStaleReservations(db, { businessId: business.id, take: 50 });
    } catch (sweeperErr) {
      // Non-fatal — availability check will be slightly conservative at worst
      console.warn(
        "[create-session] Stale reservation sweeper error:",
        sweeperErr,
      );
      // Warning level because one failure really is harmless. A PERSISTENT one
      // is not: expired reservations are never released, `reservedQty` only
      // climbs, and eventually real shoppers are told that in-stock products are
      // out of stock — a silent, self-inflicted store outage that looks like a
      // stock problem. The cron sweep is the other half of this safety net, so
      // seeing both fail together is the shape to watch for.
      Sentry.captureException(sweeperErr, {
        level: "warning",
        tags: {
          route: "stripe.create-session",
          "inventory.step": "sweep-stale-reservations",
          businessId: business.id,
        },
      });
    }

    // Validate cart: all items must exist, be published, and be in stock
    // (schema guarantees items is a non-empty array with valid quantities)
    const itemList = items;

    const variantIds = [
      ...new Set(
        itemList
          .map((i) => i.variantId)
          .filter((id: unknown): id is string => !!id),
      ),
    ] as string[];
    const productIds = [
      ...new Set(itemList.map((i) => i.productId).filter(Boolean)),
    ] as string[];

    // The cart's catalog rows, current stock included. Loaded again after
    // the supersede below when that released the shopper's own hold, so the
    // stock check sees the freed units.
    const loadCart = async () => {
      const [variantsWithProduct, productsNoVariant] = await Promise.all([
        variantIds.length > 0
          ? db.productVariant.findMany({
              where: {
                id: { in: variantIds },
                product: { businessId: business.id },
              },
              select: {
                id: true,
                price: true,
                inventoryQty: true,
                reservedQty: true,
                name: true,
                sku: true,
                productId: true,
                product: {
                  select: {
                    businessId: true,
                    name: true,
                    sku: true,
                    published: true,
                    trackInventory: true,
                    allowBackorders: true,
                    price: true,
                    additionalFields: true,
                    weight: true,
                    weightUnit: true,
                    images: {
                      select: { url: true },
                      orderBy: { sortOrder: "asc" },
                      take: 1,
                    },
                  },
                },
              },
            })
          : [],
        db.product.findMany({
          where: {
            id: { in: productIds },
            businessId: business.id,
          },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            published: true,
            trackInventory: true,
            allowBackorders: true,
            inventoryQty: true,
            reservedQty: true,
            additionalFields: true,
            baseInventoryUnitId: true,
            baseUnitsConsumed: true,
            weight: true,
            weightUnit: true,
            _count: { select: { variants: true } },
            images: {
              select: { url: true },
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        }),
      ]);

      const variantMap = new Map(variantsWithProduct.map((v) => [v.id, v]));
      const productMap = new Map(productsNoVariant.map((p) => [p.id, p]));

      // Aggregate base units demanded per pool across the whole cart
      const poolDemand = computePoolDemand(itemList, productMap);

      const poolIds = [...poolDemand.keys()];
      const pools =
        poolIds.length > 0
          ? await db.baseInventoryUnit.findMany({
              where: { id: { in: poolIds }, businessId: business.id },
              select: {
                id: true,
                inventoryQty: true,
                reservedQty: true,
                allowBackorders: true,
              },
            })
          : [];
      const poolMap = new Map(pools.map((p) => [p.id, p]));

      // Option definitions (live stock of linked values included), only when
      // the store has options on. Loaded for every cart product, not just the
      // configured lines: a product with a REQUIRED group posted without a
      // build must be rejected too.
      const definitions: Map<string, CustomizerDefinition> = optionsEnabled
        ? await loadCustomizerDefinitions(db, business.id, productIds)
        : new Map<string, CustomizerDefinition>();

      return { variantMap, productMap, poolDemand, poolMap, definitions };
    };

    type LoadedCart = Awaited<ReturnType<typeof loadCart>>;

    // Server price of a line's product/variant before options, or null when
    // the catalog row is missing.
    const basePriceOf = (cartRows: LoadedCart, index: number) => {
      const item = itemList[index]!;
      if (item.variantId) {
        const variant = cartRows.variantMap.get(item.variantId);
        return variant
          ? resolveVariantPrice(variant.price, variant.product.price)
          : null;
      }
      return cartRows.productMap.get(item.productId)?.price ?? null;
    };

    const emptyStockRows: StockRows = {
      variants: new Map(),
      products: new Map(),
      pools: new Map(),
    };

    // The catalog check plus the product customizer: every configured line is
    // re-priced from ids (`evaluateCheckoutCustomizations`), the stock rows of
    // its linked option values are loaded, and the whole cart's demand —
    // plain lines and option components together — is checked against stock
    // per variant/product/pool (`findOverdrawnLines`), so two lines can't
    // each take the last charm. Rejections map back to the PARENT line.
    // A cart with no options involved skips all of it and gets the exact
    // `checkCartAvailability` result it always had.
    const assessCart = async (cartRows: LoadedCart) => {
      const availability: CartAvailabilityResult = checkCartAvailability({
        items: itemList,
        ...cartRows,
      });
      const anyConfigured = itemList.some(isConfiguredLine);
      if (!anyConfigured && cartRows.definitions.size === 0) {
        return {
          availability,
          configured: new Map<number, ConfiguredLine>(),
          unitPrices: new Map<number, number>(),
          stockRows: emptyStockRows,
        };
      }

      const failedLines = new Set(
        availability.unavailableDetails.map((d) => d.lineIndex),
      );
      const { configured, failures, unitPrices } =
        evaluateCheckoutCustomizations({
          items: itemList,
          optionsEnabled,
          definitions: cartRows.definitions,
          basePriceOf: (index) =>
            failedLines.has(index) ? null : basePriceOf(cartRows, index),
        });
      const markFailed = (
        lineIndex: number,
        reason: (typeof failures)[0]["reason"],
      ) => {
        if (failedLines.has(lineIndex)) return;
        failedLines.add(lineIndex);
        configured.delete(lineIndex);
        const item = itemList[lineIndex]!;
        pushUnavailableLine(availability, itemList, {
          productId: item.productId,
          variantId: item.variantId ?? null,
          reason,
          lineIndex,
        });
      };
      for (const failure of failures) {
        markFailed(failure.lineIndex, failure.reason);
      }

      const stockRows = await loadComponentStockRows(cartRows, configured);
      if (configured.size > 0) {
        const demands = buildLineDemands({
          items: itemList,
          configured,
          rows: stockRows,
        }).filter((d) => !failedLines.has(d.lineIndex));
        for (const failure of findOverdrawnLines(demands, stockRows)) {
          markFailed(failure.lineIndex, failure.reason);
        }
      }
      return { availability, configured, unitPrices, stockRows };
    };

    // Stock rows for the cart lines AND the linked option values of the
    // configured lines (which may be unpublished products — an owner can
    // track stock on an option without listing it). Everything scoped to the
    // business.
    const loadComponentStockRows = async (
      cartRows: LoadedCart,
      configured: ReadonlyMap<number, ConfiguredLine>,
    ): Promise<StockRows> => {
      const components = [...configured.values()].flatMap(
        (line) => line.components,
      );
      const componentVariantIds = [
        ...new Set(
          components.map((c) => c.variantId).filter((id): id is string => !!id),
        ),
      ];
      const componentProductIds = [
        ...new Set(
          components.filter((c) => !c.variantId).map((c) => c.productId),
        ),
      ];
      const [componentVariants, componentProducts] = await Promise.all([
        componentVariantIds.length > 0
          ? db.productVariant.findMany({
              where: {
                id: { in: componentVariantIds },
                product: { businessId: business.id },
              },
              select: {
                id: true,
                inventoryQty: true,
                reservedQty: true,
                product: {
                  select: { trackInventory: true, allowBackorders: true },
                },
              },
            })
          : [],
        componentProductIds.length > 0
          ? db.product.findMany({
              where: {
                id: { in: componentProductIds },
                businessId: business.id,
              },
              select: {
                id: true,
                trackInventory: true,
                allowBackorders: true,
                inventoryQty: true,
                reservedQty: true,
                baseInventoryUnitId: true,
                baseUnitsConsumed: true,
              },
            })
          : [],
      ]);
      const extraPoolIds = [
        ...new Set(
          componentProducts
            .map((p) => p.baseInventoryUnitId)
            .filter((id): id is string => !!id && !cartRows.poolMap.has(id)),
        ),
      ];
      const extraPools =
        extraPoolIds.length > 0
          ? await db.baseInventoryUnit.findMany({
              where: { id: { in: extraPoolIds }, businessId: business.id },
              select: {
                id: true,
                inventoryQty: true,
                reservedQty: true,
                allowBackorders: true,
              },
            })
          : [];
      // Cart rows win on overlap (same read, and they carry more fields).
      return {
        variants: new Map<string, StockVariantRow>([
          ...componentVariants.map((v) => [v.id, v] as const),
          ...cartRows.variantMap,
        ]),
        products: new Map<string, StockProductRow>([
          ...componentProducts.map((p) => [p.id, p] as const),
          ...cartRows.productMap,
        ]),
        pools: new Map<string, StockPoolRow>([
          ...extraPools.map((p) => [p.id, p] as const),
          ...cartRows.poolMap,
        ]),
      };
    };

    // Reject an unsellable cart. Shared by the pre-supersede check (lines that
    // can never be sold) and the stock check after it.
    const rejectUnavailable = ({
      unavailableItems,
      unavailableItemIds,
      unavailableDetails,
    }: ReturnType<typeof checkCartAvailability>) => {
      // Report only when at least one line failed for an owner-fault reason: a
      // deleted or unpublished product the storefront still links, a
      // `comingSoon` flag left on, a bare productId posted for a product that
      // has variants (the classic template bug — the card's add-to-cart drops
      // the variant), or a shared inventory pool whose row is gone. Each of
      // those rejects 100% of shoppers for that product until the owner fixes
      // it, and produces no other trace anywhere.
      //
      // A cart that fails purely on `out-of-stock` is deliberately silent: that
      // is ordinary scarcity, it is the single most common rejection on a
      // healthy store, and capturing it would bury every one of the reports
      // above under routine traffic.
      const ownerFaults = unavailableDetails.filter((detail) =>
        isOwnerFaultReason(detail.reason),
      );
      if (ownerFaults.length > 0) {
        const countsByReason: Record<string, number> = {};
        for (const detail of unavailableDetails) {
          countsByReason[detail.reason] =
            (countsByReason[detail.reason] ?? 0) + 1;
        }
        reportCheckoutBlocked("unavailable-items", {
          businessId: business.id,
          templateId: business.templateId,
          extra: {
            // Includes the shopper-fault reasons too, so a mixed cart shows the
            // full picture rather than implying every line was broken.
            countsByReason,
            // Catalog ids, not shopper data — the fastest path to the offending
            // row in the admin.
            offendingItems: ownerFaults.map((detail) => ({
              productId: detail.productId,
              variantId: detail.variantId,
              reason: detail.reason,
            })),
            cartItemCount: itemList.length,
            rejectedItemCount: unavailableItemIds.length,
          },
        });
      }
      const uniqueNames = [...new Set(unavailableItems)];
      return NextResponse.json(
        {
          error:
            "Some items in your cart are out of stock or no longer available. Please update your cart and try again.",
          unavailableItems: uniqueNames,
          unavailableItemIds,
        },
        { status: 400 },
      );
    };

    let cart = await loadCart();
    let assessed = await assessCart(cart);
    let availability = assessed.availability;

    // Lines that can never be sold (missing, unpublished, coming soon,
    // variant required, pool gone, a build the store can't honour) are
    // rejected now — BEFORE the supersede below, so a doomed request never
    // kills the shopper's working Stripe session. Scarcity (`out-of-stock`,
    // `option-out-of-stock`) waits until after it: the shopper's own hold may
    // be what makes the cart look sold out.
    if (
      availability.unavailableDetails.some((d) => !isScarcityReason(d.reason))
    ) {
      return rejectUnavailable(availability);
    }

    const deliveryMethod = body.deliveryMethod === "pickup" ? "pickup" : "ship";
    errorContext.deliveryMethod = deliveryMethod;

    if (deliveryMethod === "pickup" && !business.offersInStorePickup) {
      // The checkout UI is offering a delivery option the store never enabled —
      // a template rendering the pickup radio unconditionally, or the owner
      // switching pickup off while that markup stayed. Every shopper who picks
      // it is rejected at the last step, after filling in the whole form.
      reportCheckoutBlocked("pickup-not-enabled", {
        businessId: business.id,
        templateId: business.templateId,
        extra: {
          requestedDeliveryMethod: deliveryMethod,
          offersInStorePickup: business.offersInStorePickup,
        },
      });
      return NextResponse.json(
        { error: "In-store pickup is not available for this store" },
        { status: 400 },
      );
    }

    if (deliveryMethod === "ship") {
      const saPre = customerInfo.shippingAddress;
      if (
        !saPre ||
        typeof saPre.line1 !== "string" ||
        !saPre.line1.trim() ||
        typeof saPre.city !== "string" ||
        !saPre.city.trim() ||
        typeof saPre.state !== "string" ||
        !saPre.state.trim() ||
        typeof saPre.postalCode !== "string" ||
        !saPre.postalCode.trim() ||
        !getAllowedCountries(business.salesCountries).includes(
          saPre.country as SupportedCountry,
        )
      ) {
        // Three shapes reach here, all of them the store's problem rather than
        // the shopper's: the form posted no `shippingAddress` at all on a `ship`
        // order (a template that hides the address block, or only sends it for
        // one delivery method); a field arrived whitespace-only, which the
        // schema's `min(1)` accepts and this check does not; or the country is
        // absent from `business.salesCountries` — a country picker built from a
        // hardcoded list instead of `getAllowedCountries(...)`, which the schema
        // does not validate at all. (A genuinely empty field fails the schema
        // first and surfaces as `invalid-request-body`.) The shopper only sees
        // "Complete shipping address is required" with no indication of WHICH
        // field, so they retry, fail again, and leave.
        //
        // Field NAMES and the country code only — the shopper's actual address
        // is PII and never leaves the request (`sendDefaultPii` is false).
        const allowedCountries = getAllowedCountries(business.salesCountries);
        const isBlank = (value: unknown) =>
          typeof value !== "string" || value.trim().length === 0;
        const blankAddressFields = saPre
          ? REQUIRED_SHIPPING_FIELDS.filter((field) => isBlank(saPre[field]))
          : [...REQUIRED_SHIPPING_FIELDS];
        reportCheckoutBlocked("incomplete-shipping-address", {
          businessId: business.id,
          templateId: business.templateId,
          extra: {
            hasShippingAddress: !!saPre,
            blankAddressFields,
            // ISO country code — not PII, and the whole diagnosis when the
            // store's sales countries and the form's list have drifted apart.
            requestedCountry: saPre?.country ?? null,
            countryAllowed:
              !!saPre &&
              allowedCountries.includes(saPre.country as SupportedCountry),
            allowedCountryCount: allowedCountries.length,
          },
        });
        return NextResponse.json(
          { error: "Complete shipping address is required" },
          { status: 400 },
        );
      }

      // Extra guard for zone_weight orders: the address is locked to what was
      // entered in our form (Stripe won't re-collect it). Reject here if the
      // country is not in the business's allowed list so a bad actor can't
      // POST a disallowed country that Stripe would otherwise accept.
      //
      // Not reported: this is defense-in-depth behind the identical country
      // check above, which already returned for a disallowed country — anything
      // that would trip here has been captured as `incomplete-shipping-address`
      // one branch earlier, so a capture here could only ever be a duplicate.
      if (
        business.shippingType === SHIPPING_TYPES.ZONE_WEIGHT &&
        saPre?.country &&
        !getAllowedCountries(business.salesCountries).includes(
          saPre.country as SupportedCountry,
        )
      ) {
        return NextResponse.json(
          { error: "Shipping to this country is not available" },
          { status: 400 },
        );
      }
    }

    // Always use server-fetched prices for subtotal — never trust client-supplied amounts.
    // This ensures discounts and free-shipping thresholds are computed against real prices.
    // (Prices are not affected by the supersede reload below — only stock.)
    // Configured lines are priced base + add-ons (`priceConfiguration`),
    // independent of stock. Recomputed after the supersede reload below.
    const subtotalOf = (rows: LoadedCart, unitPrices: Map<number, number>) =>
      computeSubtotalCents(
        itemList,
        rows.variantMap,
        rows.productMap,
        unitPrices,
      );
    let subtotalCents = subtotalOf(cart, assessed.unitPrices);

    // Ignore any supplied discount code when the coupons feature is disabled —
    // the store has turned discounts off, so a stale/injected code must not apply.
    const rawDiscountId =
      couponsEnabled &&
      typeof discountCodeId === "string" &&
      discountCodeId.trim() !== ""
        ? discountCodeId.trim()
        : null;

    const findDiscountRow = (id: string) =>
      db.discountCode.findFirst({
        where: {
          id,
          businessId: business.id,
        },
      });

    let discountRow = rawDiscountId
      ? await findDiscountRow(rawDiscountId)
      : null;

    // Deliberately NOT reported, here and in the `validateAndComputeDiscount`
    // rejections below: a bad, expired, exhausted or per-customer-capped code
    // is routine shopper behavior (mistyped codes, screenshots of old promos),
    // it blocks nothing — the shopper can still check out by clearing the
    // field — and it would be by far the noisiest branch here.
    if (rawDiscountId && !discountRow) {
      return NextResponse.json(
        { error: "Invalid or expired discount code" },
        { status: 400 },
      );
    }

    if (discountRow) {
      // The code's rules that no checkout hold can affect — active, start /
      // expiry dates, minimum purchase — checked BEFORE the supersede below,
      // so a doomed request never kills the shopper's working Stripe session.
      // The usage limits (total and per-customer) are what the shopper's own
      // hold can trip; they are checked after the supersede.
      const holdIndependent = validateAndComputeDiscount(
        { ...discountRow, usageLimit: null, perCustomerLimit: null },
        subtotalCents,
      );
      if (!holdIndependent.ok) {
        return NextResponse.json(
          { error: holdIndependent.error },
          { status: 400 },
        );
      }
    }

    // ── Supersede the shopper's own previous checkout ──────────────────────
    // A shopper who went to Stripe, pressed Back and continues to payment
    // again still has that first session open, holding their stock and any
    // discount use for up to 30 minutes — enough to reject a single-use (or
    // per-customer-1) code, or the last unit, with their OWN hold. If the
    // SIGNED `pending_session` cookie names an active reservation of this
    // store whose session is still open, mark it (no abandoned-cart email),
    // expire it on Stripe and release that reservation once Stripe confirms
    // the expiry.
    //
    // Placement: AFTER every check above that does not depend on holds (cart
    // lines exist + are sellable, delivery/address/country, the code exists +
    // its active/date/min-purchase rules), so a request rejected on its own
    // merits leaves the shopper's working session alone. BEFORE everything
    // the shopper's own hold could fail: the stock check, the usage-limit /
    // per-customer checks and the reservation claim. Never throws — a
    // supersede problem never blocks this checkout.
    const { released } = await supersedePendingCheckout(db, {
      headers: req.headers,
      businessId: business.id,
    });
    if (released) {
      // The released hold gave back stock (reservedQty) and maybe a code use
      // (usageCount): re-read both so the checks below see them.
      cart = await loadCart();
      assessed = await assessCart(cart);
      availability = assessed.availability;
      subtotalCents = subtotalOf(cart, assessed.unitPrices);
      if (discountRow) {
        discountRow = await findDiscountRow(discountRow.id);
        if (!discountRow) {
          return NextResponse.json(
            { error: "Invalid or expired discount code" },
            { status: 400 },
          );
        }
      }
    }
    const { variantMap, productMap, poolMap } = cart;
    const { configured, stockRows } = assessed;

    if (availability.unavailableItems.length > 0) {
      return rejectUnavailable(availability);
    }

    let discountCents = 0;
    let verifiedDiscountCodeId: string | null = null;
    let verifiedDiscountType: string | null = null;

    if (discountRow) {
      // Per-customer limit: count this shopper's prior (non-cancelled) orders
      // that used this code, plus their still-open checkouts holding a use of
      // it (a delayed bank payment has no order for days — see the discount
      // entry on the reservation below). Authoritative check — the storefront
      // validate endpoint may not have known the email. Not atomic: two
      // simultaneous checkouts by the same shopper can both pass; the TOTAL
      // usageLimit claim below is the atomic one. Shared with the storefront
      // Apply (discount.validate) so the two can't disagree. No exclusion
      // here: the shopper's own superseded checkout was already released above.
      const { customerUsageCount } = await discountUsageForCheckout(db, {
        businessId: business.id,
        discount: discountRow,
        customerEmail: normalizeEmail(customerInfo.email),
      });

      // Shipping isn't computed yet: free_shipping codes yield 0 here and are
      // applied to the shipping amount below once it's known.
      const computed = validateAndComputeDiscount(discountRow, subtotalCents, {
        customerUsageCount,
      });
      if (!computed.ok) {
        // Not reported — see above. All six rejection messages are
        // shopper-facing coupon rules working correctly, and the order can
        // still be placed without the code.
        return NextResponse.json({ error: computed.error }, { status: 400 });
      }

      discountCents = computed.discountAmountCents;
      verifiedDiscountCodeId = discountRow.id;
      verifiedDiscountType = discountRow.type;
    }

    const shippingConfig = shippingConfigFromBusiness({
      shippingType: business.shippingType,
      shippingFlatRate: business.shippingFlatRate,
      freeShippingThreshold: business.freeShippingThreshold,
      offersInStorePickup: business.offersInStorePickup,
    });

    // Compute total cart weight in pounds for zone+weight shipping.
    // Variants use the parent product's weight. Products with no weight set
    // fall back to business.shippingDefaultItemWeightLb (default 0).
    const defaultItemWeightLb = business.shippingDefaultItemWeightLb ?? 0;
    let totalWeightLb = 0;
    for (const item of itemList) {
      let weightLb: number;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        const pw = variant?.product.weight ?? null;
        const pu = variant?.product.weightUnit ?? null;
        weightLb =
          pw != null ? normalizeWeightToLb(pw, pu) : defaultItemWeightLb;
      } else {
        const product = productMap.get(item.productId);
        const pw = product?.weight ?? null;
        const pu = product?.weightUnit ?? null;
        weightLb =
          pw != null ? normalizeWeightToLb(pw, pu) : defaultItemWeightLb;
      }
      totalWeightLb += weightLb * item.quantity;
    }

    let shippingCents = 0;
    let shippingDisplayName = "Shipping";
    if (deliveryMethod === "pickup") {
      shippingCents = 0;
      shippingDisplayName = "In-Store Pickup";
    } else if (business.shippingType === SHIPPING_TYPES.ZONE_WEIGHT) {
      // Load zones with rates for this business (not included in getBusinessByDomain).
      const businessZones = await db.shippingZone.findMany({
        where: { businessId: business.id },
        include: { rates: true },
        orderBy: { sortOrder: "asc" },
      });
      const zoneWeightConfig = buildZoneWeightConfig({
        shippingWeightTiers: business.shippingWeightTiers,
        shippingFallbackRate: business.shippingFallbackRate,
        freeShippingThreshold: business.freeShippingThreshold,
        shippingDefaultItemWeightLb: business.shippingDefaultItemWeightLb,
        zones: businessZones,
      });
      const sa = customerInfo.shippingAddress;
      shippingCents = calculateZoneWeightShipping({
        destinationState: sa?.state ?? "",
        destinationCountry: sa?.country ?? "",
        totalWeightLb,
        subtotalCents,
        config: zoneWeightConfig,
        // Once per checkout attempt, and downstream of the address validation
        // above — so a fallback here is the store's rate matrix failing on a
        // complete, in-`salesCountries` destination, and the amount is what the
        // shopper is actually charged rather than a preview. Unlike the blocks
        // reported by `reportCheckoutBlocked`, nothing is rejected: the session
        // is created and the order goes through at the fallback price.
        // Throttled inside the reporter — see shipping-config.ts.
        onFallback: (info) =>
          reportZoneWeightFallback(info, {
            businessId: business.id,
            source: "stripe.create-session",
          }),
      });
      shippingDisplayName =
        shippingCents === 0 ? "Free shipping" : "Standard shipping";
    } else {
      shippingCents = calculateShipping(subtotalCents, shippingConfig);
      shippingDisplayName =
        shippingCents === 0 ? "Free shipping" : "Standard shipping";
    }

    // Free-shipping discount codes: the discount amount IS the computed
    // shipping cost. Rather than a coupon/negative line item, the shipping
    // option presented to Stripe becomes free ($0). The original shipping
    // value travels in metadata (`freeShippingDiscountCents`) so the order
    // records shipping + discount at that value and totals reconcile:
    //   subtotal + shipping(S) - discount(S) = amount_total.
    let freeShippingDiscountCents = 0;
    if (
      verifiedDiscountType === "free_shipping" &&
      deliveryMethod === "ship" &&
      shippingCents > 0
    ) {
      freeShippingDiscountCents = shippingCents;
      shippingCents = 0;
      shippingDisplayName = "Free shipping";
    }

    // Initialize Stripe with platform account

    // Create line items for Stripe (metadata so webhook can store product/variant and deduct inventory)
    const lineItems = itemList.map(
      (item, index): Stripe.Checkout.SessionCreateParams.LineItem => {
        // Always use server-fetched prices — never trust client-supplied amounts
        const variantRecord = item.variantId
          ? variantMap.get(item.variantId)
          : undefined;
        const productRecord = productMap.get(item.productId);
        const serverPrice = variantRecord
          ? resolveVariantPrice(
              variantRecord.price,
              variantRecord.product.price,
            )
          : productRecord?.price;

        if (serverPrice == null) {
          throw new Error(`Price not found for item ${item.productId}`);
        }
        const configuredLine = configured.get(index);

        // Use server-fetched image URL — never trust client-supplied imageUrl.
        // Client URLs may be relative paths or malformed, which causes Stripe to
        // reject the session with "Not a valid URL".
        const rawImageUrl =
          variantRecord?.product.images[0]?.url ??
          productRecord?.images[0]?.url ??
          // Stripe product images must be raster; an SVG logo is skipped.
          rasterImageUrl(business.siteContent?.logoUrl) ??
          null;
        const imageUrl =
          rawImageUrl?.startsWith("https://") ||
          rawImageUrl?.startsWith("http://")
            ? rawImageUrl
            : null;

        if (configuredLine) {
          // Configured line: everything shown or stored comes from the database
          // and the server-priced snapshot — never the client's name, variant
          // or price. `lineConfig` points the webhook at the stored build
          // (`InventoryReservation.lineConfigs`); `optionsSummary` lets
          // session-only emails (processing / failed / abandoned) show it.
          const dbProductName =
            variantRecord?.product.name ??
            productRecord?.name ??
            item.productName;
          const dbVariantName = variantRecord?.name ?? null;
          const dbSku = variantRecord
            ? (variantRecord.sku ?? variantRecord.product.sku)
            : (productRecord?.sku ?? null);
          const summary = configuredLine.snapshot.summary;
          const description = truncateUtf16(
            [dbVariantName, summary].filter(Boolean).join(" · "),
            STRIPE_DESCRIPTION_MAX,
          );
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: dbProductName,
                description: description || undefined,
                images: imageUrl ? [imageUrl] : undefined,
                metadata: {
                  productId: String(item.productId),
                  productVariantId: String(item.variantId ?? ""),
                  variantName: dbVariantName ?? "",
                  sku: dbSku ?? "",
                  [LINE_CONFIG_METADATA_KEY]: configuredLine.serverKey,
                  [OPTIONS_SUMMARY_METADATA_KEY]: truncateUtf16(
                    summary,
                    STRIPE_OPTIONS_SUMMARY_MAX,
                  ),
                },
              },
              unit_amount: Math.round(configuredLine.unitPrice),
            },
            quantity: item.quantity,
          };
        }

        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.productName,
              description: item.variantName ?? undefined,
              images: imageUrl ? [imageUrl] : undefined,
              metadata: {
                productId: String(item.productId ?? ""),
                productVariantId: String(item.variantId ?? ""),
                variantName: String(item.variantName ?? ""),
                sku: String(item.sku ?? ""),
              },
            },
            unit_amount: serverPrice,
          },
          quantity: item.quantity,
        };
      },
    );

    // Determine success/cancel URLs
    const isDev = process.env.NODE_ENV === "development";
    const platformDomain = env.NEXT_PUBLIC_PLATFORM_DOMAIN;
    const baseUrl = isDev
      ? `http://${domain}`
      : business.customDomain && business.domainStatus === "ACTIVE"
        ? `https://${business.customDomain}`
        : `https://${business.subdomain}.${platformDomain}`;

    const sa = customerInfo.shippingAddress;
    const contactPhone = (customerInfo.phone ?? sa?.phone)?.trim() ?? "";
    const hasFullShipping =
      deliveryMethod === "ship" &&
      !!sa &&
      typeof sa.line1 === "string" &&
      sa.line1.trim().length > 0 &&
      typeof sa.city === "string" &&
      sa.city.trim().length > 0 &&
      typeof sa.state === "string" &&
      sa.state.trim().length > 0 &&
      typeof sa.postalCode === "string" &&
      sa.postalCode.trim().length > 0 &&
      getAllowedCountries(business.salesCountries).includes(
        sa.country as SupportedCountry,
      ) &&
      contactPhone.length > 0;

    let stripeCustomerId: string | undefined;

    if (hasFullShipping && sa) {
      const line1 = sa.line1.trim();
      const line2 = sa.line2?.trim();
      const city = sa.city.trim();
      const state = sa.state.trim();
      const postalCode = sa.postalCode.trim();
      const country = sa.country;

      const customer = await stripeClient.customers.create(
        {
          email: customerInfo.email,
          name: customerInfo.name,
          phone: contactPhone,
          shipping: {
            name: customerInfo.name,
            phone: contactPhone,
            address: {
              line1,
              ...(line2 ? { line2 } : {}),
              city,
              state,
              postal_code: postalCode,
              country,
            },
          },
        },
        { stripeAccount: business.stripeAccountId },
      );
      stripeCustomerId = customer.id;
    }

    // Zone+weight rates are priced from the address entered in our form. Stripe
    // Checkout can't recompute shipping when the shopper edits the address, so we
    // LOCK the destination (no `shipping_address_collection`) for zone_weight ship
    // orders — otherwise a shopper could pick a cheap state here, then switch to a
    // far one on Stripe and pay the cheaper fixed rate. Address-independent modes
    // (free/flat) keep Stripe's editable address.
    const lockShippingAddress =
      deliveryMethod === "ship" &&
      business.shippingType === SHIPPING_TYPES.ZONE_WEIGHT &&
      hasFullShipping &&
      !!sa;

    // Shipping: `shipping_options` sets the amount Stripe charges (Connect webhook reads `amount_shipping`).
    // Address collection only when shipping to customer (not in-store pickup), and
    // never for locked zone_weight orders (the address is bound to the PaymentIntent below).
    // Phone: `phone_number_collection` prefills when Customer.phone is set.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems,
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      ...(stripeCustomerId
        ? {
            customer: stripeCustomerId,
            // Only sync shipping from Stripe-collected address when we actually
            // collect one. Stripe rejects `customer_update[shipping]: "auto"`
            // without `shipping_address_collection`.
            ...(lockShippingAddress
              ? {}
              : { customer_update: { shipping: "auto" as const } }),
          }
        : { customer_email: customerInfo.email }),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: shippingCents,
              currency: "usd",
            },
            display_name: shippingDisplayName,
          },
        },
      ],
      ...(deliveryMethod === "ship" && !lockShippingAddress
        ? {
            shipping_address_collection: {
              allowed_countries: getAllowedCountries(
                business.salesCountries,
              ) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection["allowed_countries"],
            },
          }
        : {}),
      // Locked zone_weight order: bind the priced destination to the PaymentIntent so the
      // webhook can record it (resolver tier 2). When auto tax is enabled we CANNOT send
      // `payment_intent_data.shipping` — Stripe rejects the combination with "You cannot
      // enable automatic tax calculation with payment_intent_data[shipping] set". When auto
      // tax is on, the locked address still reaches the webhook via `metadata.shipping*`
      // (resolver tier 3), and Stripe Tax derives the destination from the attached Customer's
      // shipping address (set above). The address stays locked because
      // `shipping_address_collection` is omitted either way.
      ...(shouldPinPaymentIntentShipping({
        lockShippingAddress,
        hasShippingAddress: !!sa,
        autoTaxEnabled: business.stripeAutoTaxEnabled,
      }) && sa
        ? {
            payment_intent_data: {
              shipping: {
                name: customerInfo.name,
                phone: contactPhone,
                address: {
                  line1: sa.line1.trim(),
                  ...(sa.line2?.trim() ? { line2: sa.line2.trim() } : {}),
                  city: sa.city.trim(),
                  state: sa.state.trim(),
                  postal_code: sa.postalCode.trim(),
                  country: sa.country,
                },
              },
            },
          }
        : {}),
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        businessId: business.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        discountCodeId: verifiedDiscountCodeId ?? "",
        // Tells /api/stripe/session this session's owner holds a SIGNED
        // pending_session cookie (no legacy bare-cookie fallback for it).
        [PENDING_COOKIE_MARKER_KEY]: PENDING_COOKIE_MARKER_VALUE,
        ...(freeShippingDiscountCents > 0
          ? { freeShippingDiscountCents: String(freeShippingDiscountCents) }
          : {}),
        deliveryMethod,
        ...(hasFullShipping && sa
          ? {
              shippingLine1: sa.line1.trim(),
              shippingLine2: sa.line2?.trim() ?? "",
              shippingCity: sa.city.trim(),
              shippingState: sa.state.trim(),
              shippingPostalCode: sa.postalCode.trim(),
              shippingCountry: sa.country,
              shippingPhone: contactPhone,
            }
          : {}),
      },
    };

    // Add discount if applicable (amount computed server-side when code present)
    if (discountCents > 0) {
      sessionParams.discounts = [
        {
          coupon: await createStripeCoupon(
            stripeClient,
            business.stripeAccountId,
            discountCents,
          ),
        },
      ];
    }

    // Enable automatic tax collection only if the owner has opted in.
    // Requires active tax registrations on their Stripe account — if none are
    // configured, Stripe will reject the session. The admin toggle warns owners
    // about this before they enable it.
    if (business.stripeAutoTaxEnabled) {
      sessionParams.automatic_tax = { enabled: true };
    }

    // Build reservation entries for tracked, non-backorder items only.
    // Pool items reserve against the pool; variant items against the variant;
    // plain product items (no pool, no variant) against the product.
    const reservationEntries: ReservationEntry[] = [];
    for (const item of itemList) {
      const qty = Number(item.quantity) || 1;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (
          variant?.product.trackInventory &&
          !variant.product.allowBackorders
        ) {
          reservationEntries.push({ variantId: item.variantId, qty });
        }
      } else {
        const product = productMap.get(item.productId);
        if (product) {
          if (product.baseInventoryUnitId) {
            // Pool: aggregate by pool id (one entry per pool, summed demand)
            const existing = reservationEntries.find(
              (e) => e.baseInventoryUnitId === product.baseInventoryUnitId,
            );
            const pool = poolMap.get(product.baseInventoryUnitId);
            if (pool && !pool.allowBackorders) {
              const baseUnits = (product.baseUnitsConsumed ?? 1) * qty;
              if (existing) {
                existing.qty += baseUnits;
              } else {
                reservationEntries.push({
                  baseInventoryUnitId: product.baseInventoryUnitId,
                  qty: baseUnits,
                });
              }
            }
          } else if (product.trackInventory && !product.allowBackorders) {
            reservationEntries.push({ productId: item.productId, qty });
          }
        }
      }
    }

    // Linked option values of configured lines (a charm that is its own
    // stocked product) are held exactly like cart lines — same three
    // branches, pool holds folded into the pool's entry — so the webhook's
    // consume step drops their reservedQty with everything else, and every
    // release path (expiry, failure, sweep) gives them back.
    for (const line of configured.values()) {
      const qty = Number(itemList[line.lineIndex]!.quantity) || 1;
      for (const component of line.components) {
        appendHold(
          reservationEntries,
          holdForTarget(component, component.qtyPerUnit * qty, stockRows),
        );
      }
    }

    // The builds themselves, keyed by the server line key on each Stripe
    // line's `metadata.lineConfig`. The full priced snapshot is stored (not
    // just the ids) so the webhook copies it verbatim and never re-prices
    // against a definition the owner may have edited since. A configured
    // cart therefore always gets a reservation row, even with nothing
    // tracked (same precedent as the discount-only row below).
    const lineConfigs: StoredLineConfigs | null =
      configured.size > 0
        ? Object.fromEntries(
            [...configured.values()].map((line) => [
              line.serverKey,
              { selection: line.selection, snapshot: line.snapshot },
            ]),
          )
        : null;

    // A verified discount code holds one use for this checkout, like a unit of
    // stock: `reserveInventory` claims it atomically (usageCount + 1 under
    // usageLimit), releasing the reservation gives it back, and consuming it
    // when the order is created makes it final (the webhook then skips its
    // own increment). Counting from checkout start matters for delayed (bank)
    // payments, which stay open for days — otherwise every pending checkout
    // could redeem a single-use code. A cart with no tracked stock still gets
    // a reservation row for this entry alone; that row only feeds the
    // `stripeSessionId` lookup the webhook already does, and the session's
    // `expires_at` is aligned to the 30-minute window for every cart anyway.
    if (verifiedDiscountCodeId) {
      reservationEntries.push({
        discountCodeId: verifiedDiscountCodeId,
        customerEmail: normalizeEmail(customerInfo.email),
        qty: 1,
      });
    }

    // Reserve inventory and create an InventoryReservation record before
    // creating the Stripe session. If the reserve fails (race), treat it as
    // out-of-stock — or, for the discount entry, as a used-up code.
    const RESERVATION_SECONDS = 30 * 60; // 30 minutes
    let reservationId: string | null = null;

    if (reservationEntries.length > 0 || lineConfigs) {
      try {
        // Throwing OutOfStockError on a failed reserve forces Prisma to roll
        // back the whole transaction, including any reservedQty increments made
        // for earlier entries in the loop (a `return` would COMMIT those and
        // leak an unreleasable hold).
        reservationId = await db.$transaction(async (tx) => {
          const result = await reserveInventory(tx, {
            entries: reservationEntries,
            businessId: business.id,
          });
          if (!result.ok) {
            throw result.reason === "discount"
              ? new DiscountExhaustedError()
              : new OutOfStockError();
          }

          const res = await tx.inventoryReservation.create({
            data: {
              businessId: business.id,
              status: "active",
              expiresAt: new Date(Date.now() + RESERVATION_SECONDS * 1000),
              items: reservationEntries,
              ...(lineConfigs
                ? { lineConfigs: lineConfigs as Prisma.InputJsonValue }
                : {}),
            },
            select: { id: true },
          });
          return res.id;
        });
      } catch (reserveErr) {
        if (reserveErr instanceof DiscountExhaustedError) {
          // Not reported, like the validation rejections above: the code's
          // last use went to another checkout a moment ago. Same wording as
          // `validateAndComputeDiscount`'s usage-limit rejection.
          return NextResponse.json(
            { error: "This discount code has reached its usage limit" },
            { status: 400 },
          );
        }
        if (reserveErr instanceof OutOfStockError) {
          // Not reported: this is the race where another shopper's reservation
          // won between the availability check above and this transaction.
          // Correct, expected behavior on a store selling the last unit — the
          // system is protecting stock, not failing. The owner-fault causes of
          // an unsellable cart were already reported at the availability check.
          //
          // The failed claim doesn't say WHICH line lost, so re-read stock
          // (the transaction rolled back, so neither this cart's holds nor its
          // discount use are counted) and reject only the lines that are now
          // short — the client removes exactly those (`rejectUnavailable`
          // stays silent on pure scarcity). If the re-read finds
          // nothing short (the competing hold already went away), no line is
          // named: the client keeps the cart and shows the message.
          const fresh = await assessCart(await loadCart());
          if (fresh.availability.unavailableItems.length > 0) {
            return rejectUnavailable(fresh.availability);
          }
          return NextResponse.json(
            {
              error:
                "Stock changed while you were checking out. Please try again.",
            },
            { status: 409 },
          );
        }
        throw reserveErr;
      }
    }

    // Add reservation id to session metadata so the webhook can locate the reservation.
    if (reservationId) {
      sessionParams.metadata = {
        ...sessionParams.metadata,
        reservationId,
      };
    }

    // Align Stripe session expiry with our reservation window.
    sessionParams.expires_at =
      Math.floor(Date.now() / 1000) + RESERVATION_SECONDS;

    // Create Stripe Checkout session
    let session: Awaited<
      ReturnType<typeof stripeClient.checkout.sessions.create>
    >;
    try {
      session = await stripeClient.checkout.sessions.create(sessionParams, {
        stripeAccount: business.stripeAccountId, // Connect to store's Stripe account
      });
    } catch (stripeErr) {
      // If Stripe session creation fails, release the reservation so stock isn't stuck.
      if (reservationId) {
        const idToRelease = reservationId;
        try {
          await db.$transaction(async (tx) => {
            // Same conditional flip as every other settlement path, so the
            // hold (stock + discount use) is given back exactly once.
            const flipped = await tx.inventoryReservation.updateMany({
              where: { id: idToRelease, status: "active" },
              data: { status: "released" },
            });
            if (flipped.count === 0) return;
            await releaseReservation(
              tx,
              { items: reservationEntries },
              { mode: "release" },
            );
          });
        } catch (releaseErr) {
          console.error(
            "[create-session] Failed to release reservation after Stripe error:",
            releaseErr,
          );
          // Both halves of the failure have to land on ONE event. `stripeErr` is
          // re-thrown below and becomes the 500 the outer catch reports, so
          // without this capture the only Sentry event blames Stripe while the
          // actual damage is thrown away: stock stays held for the full 30-minute
          // reservation window with no session that can ever consume it, and
          // real shoppers are told the product is out of stock. Carrying the
          // triggering Stripe message in `extra` means the release failure can be
          // read without hunting for the sibling 500.
          Sentry.captureException(releaseErr, {
            tags: {
              route: "stripe.create-session",
              "inventory.step": "release-after-stripe-error",
              businessId: business.id,
            },
            extra: {
              reservationId: idToRelease,
              reservationEntryCount: reservationEntries.length,
              stripeError:
                stripeErr instanceof Error
                  ? stripeErr.message
                  : String(stripeErr),
            },
          });
        }
      }
      throw stripeErr;
    }

    // Attach the Stripe session id to the reservation record now that we have it.
    if (reservationId) {
      try {
        await db.inventoryReservation.update({
          where: { id: reservationId },
          data: { stripeSessionId: session.id },
        });
      } catch (attachErr) {
        // Non-fatal — webhook will fall back to metadata.reservationId. But
        // the shopper's next checkout cannot supersede this one (that lookup
        // is by stripeSessionId only), so its hold simply lapses at the
        // 30-minute expiry — worth knowing about if it ever recurs.
        console.warn(
          "[create-session] Failed to attach stripeSessionId to reservation:",
          attachErr,
        );
        Sentry.captureException(attachErr, {
          level: "warning",
          tags: {
            route: "stripe.create-session",
            "inventory.step": "attach-session-to-reservation",
            businessId: business.id,
          },
          extra: { reservationId, stripeSessionId: session.id },
        });
      }
    }

    const response = NextResponse.json({
      sessionUrl: session.url,
      sessionId: session.id,
    });
    // Signed (`<sessionId>.<hmac>`, bound to this business): the session id
    // itself is visible in Stripe URLs, and the supersede above expires and
    // releases whatever session this cookie names — see
    // pending-session-cookie.ts.
    response.cookies.set(
      PENDING_SESSION_COOKIE,
      signPendingSessionCookie(session.id, business.id),
      {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: PENDING_SESSION_COOKIE_MAX_AGE,
      },
    );
    return response;
  } catch (error: unknown) {
    console.error("Create checkout session error:", error);
    Sentry.withScope((scope) => {
      scope.setTag("route", "stripe.create-session");
      // Without this snapshot every 500 out of this route is one undifferentiated
      // issue with no way to tell which store, template or delivery path it came
      // from. `stripeChargesEnabled` is the one that pays for itself: nothing in
      // checkout ever reads it, so a store whose Connect onboarding is
      // incomplete — or whose account was later restricted — passes every guard
      // above and dies here as an opaque "Failed to create checkout session".
      // Seeing the flag false on the event is the entire diagnosis. (Observability
      // only: adding a guard on it would change who can check out, which this
      // pass deliberately does not do.)
      scope.setExtras(errorContext);
      // Also as tags, not just extras: extras are not searchable. Tagging these
      // is what lets one Sentry query — `businessId:<id>` — return both the
      // `Checkout blocked: …` messages above and the 500s from down here, which
      // is the whole point when triaging "this store stopped taking orders".
      // Matches the Stripe webhook, which already tags `businessId`.
      if (typeof errorContext.businessId === "string") {
        scope.setTag("businessId", errorContext.businessId);
      }
      if (typeof errorContext.templateId === "string") {
        scope.setTag("templateId", errorContext.templateId);
      }
      Sentry.captureException(error);
    });
    return NextResponse.json(
      {
        error: "Failed to create checkout session. Please try again.",
      },
      { status: 500 },
    );
  }
}
