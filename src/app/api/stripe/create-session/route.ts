import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import type { SupportedCountry } from "~/lib/geo/regions";
import type { ReservationEntry } from "~/lib/inventory/reservation";
import { env } from "~/env";
import { computeSubtotalCents } from "~/lib/checkout/pricing";
import { shouldPinPaymentIntentShipping } from "~/lib/checkout/shipping";
import {
  checkCartAvailability,
  computePoolDemand,
  isOwnerFaultReason,
} from "~/lib/checkout/validate-cart";
import { validateAndComputeDiscount } from "~/lib/discount-validation";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { getAllowedCountries } from "~/lib/geo/regions";
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

    if (!business?.stripeAccountId) {
      // The store cannot take a single order until Connect onboarding finishes.
      // Owners routinely believe they are live because the storefront renders
      // and the cart works — this branch is the proof that it doesn't. A null
      // `business` lands here too (host resolved to no store: a custom domain
      // pointed at us before its DB row was updated, or a stray probe), so
      // `businessResolved` is in the extras to tell the two apart instantly.
      reportCheckoutBlocked("stripe-not-connected", {
        businessId: business?.id,
        templateId: business?.templateId,
        host: domain,
        extra: {
          host: domain,
          businessResolved: !!business,
          hasStripeAccountId: !!business?.stripeAccountId,
          stripeChargesEnabled: business?.stripeChargesEnabled ?? null,
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
              productId: true,
              product: {
                select: {
                  businessId: true,
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

    const { unavailableItems, unavailableItemIds, unavailableDetails } =
      checkCartAvailability({
        items: itemList,
        variantMap,
        productMap,
        poolDemand,
        poolMap,
      });

    if (unavailableItems.length > 0) {
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
    const subtotalCents = computeSubtotalCents(
      itemList,
      variantMap,
      productMap,
    );

    // Ignore any supplied discount code when the coupons feature is disabled —
    // the store has turned discounts off, so a stale/injected code must not apply.
    const rawDiscountId =
      couponsEnabled &&
      typeof discountCodeId === "string" &&
      discountCodeId.trim() !== ""
        ? discountCodeId.trim()
        : null;

    let discountCents = 0;
    let verifiedDiscountCodeId: string | null = null;
    let verifiedDiscountType: string | null = null;

    if (rawDiscountId) {
      const discountRow = await db.discountCode.findFirst({
        where: {
          id: rawDiscountId,
          businessId: business.id,
        },
      });

      if (!discountRow) {
        // Deliberately NOT reported, like the `validateAndComputeDiscount`
        // rejection below: a bad, expired, exhausted or per-customer-capped code
        // is routine shopper behavior (mistyped codes, screenshots of old
        // promos), it blocks nothing — the shopper can still check out by
        // clearing the field — and it would be by far the noisiest branch here.
        return NextResponse.json(
          { error: "Invalid or expired discount code" },
          { status: 400 },
        );
      }

      // Per-customer limit: count this shopper's prior (non-cancelled) orders
      // that used this code. Authoritative check — the storefront validate
      // endpoint may not have known the email.
      let customerUsageCount: number | undefined;
      if (discountRow.perCustomerLimit != null) {
        customerUsageCount = await db.order.count({
          where: {
            businessId: business.id,
            discountCodeId: discountRow.id,
            customerEmail: normalizeEmail(customerInfo.email),
            status: { not: "cancelled" },
          },
        });
      }

      // Shipping isn't computed yet: free_shipping codes yield 0 here and are
      // applied to the shipping amount below once it's known.
      const computed = validateAndComputeDiscount(discountRow, subtotalCents, {
        customerUsageCount,
      });
      if (!computed.ok) {
        // Not reported — see the sibling branch above. All six rejection
        // messages are shopper-facing coupon rules working correctly, and the
        // order can still be placed without the code.
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
    const lineItems = itemList.map((item) => {
      // Always use server-fetched prices — never trust client-supplied amounts
      const variantRecord = item.variantId
        ? variantMap.get(item.variantId)
        : undefined;
      const productRecord = productMap.get(item.productId);
      const serverPrice = variantRecord
        ? resolveVariantPrice(variantRecord.price, variantRecord.product.price)
        : productRecord?.price;

      if (serverPrice == null) {
        throw new Error(`Price not found for item ${item.productId}`);
      }

      // Use server-fetched image URL — never trust client-supplied imageUrl.
      // Client URLs may be relative paths or malformed, which causes Stripe to
      // reject the session with "Not a valid URL".
      const rawImageUrl =
        variantRecord?.product.images[0]?.url ??
        productRecord?.images[0]?.url ??
        business.siteContent?.logoUrl ??
        null;
      const imageUrl =
        rawImageUrl?.startsWith("https://") ||
        rawImageUrl?.startsWith("http://")
          ? rawImageUrl
          : null;

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
    });

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

    // Reserve inventory and create an InventoryReservation record before
    // creating the Stripe session. If the reserve fails (race), treat it as
    // out-of-stock.
    const RESERVATION_SECONDS = 30 * 60; // 30 minutes
    let reservationId: string | null = null;

    if (reservationEntries.length > 0) {
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
          if (!result.ok) throw new OutOfStockError();

          const res = await tx.inventoryReservation.create({
            data: {
              businessId: business.id,
              status: "active",
              expiresAt: new Date(Date.now() + RESERVATION_SECONDS * 1000),
              items: reservationEntries,
            },
            select: { id: true },
          });
          return res.id;
        });
      } catch (reserveErr) {
        if (reserveErr instanceof OutOfStockError) {
          // Not reported: this is the race where another shopper's reservation
          // won between the availability check above and this transaction.
          // Correct, expected behavior on a store selling the last unit — the
          // system is protecting stock, not failing. The owner-fault causes of
          // an unsellable cart were already reported at the availability check.
          return NextResponse.json(
            {
              error:
                "Some items in your cart are out of stock or no longer available. Please update your cart and try again.",
              unavailableItems: itemList.map((i) =>
                i.variantName
                  ? `${i.productName} (${i.variantName})`
                  : i.productName,
              ),
              unavailableItemIds: itemList.map((i) => ({
                productId: i.productId,
                variantId: i.variantId ?? null,
              })),
            },
            { status: 400 },
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
            await releaseReservation(tx, { items: reservationEntries });
            await tx.inventoryReservation.update({
              where: { id: idToRelease },
              data: { status: "released" },
            });
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
        // Non-fatal — webhook will fall back to metadata.reservationId
        console.warn(
          "[create-session] Failed to attach stripeSessionId to reservation:",
          attachErr,
        );
      }
    }

    const response = NextResponse.json({
      sessionUrl: session.url,
      sessionId: session.id,
    });
    response.cookies.set("pending_session", session.id, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600,
    });
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
