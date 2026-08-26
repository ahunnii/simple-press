import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import type {
  PoolAvailability,
  ProductAvailability,
  VariantAvailability,
} from "~/lib/checkout/types";
import type { SupportedCountry } from "~/lib/geo/regions";
import { env } from "~/env";
import { findOrCreateShippingAddress } from "~/lib/address-utils";
import {
  checkCartAvailability,
  computePoolDemand,
} from "~/lib/checkout/validate-cart";
import { splitCustomerName } from "~/lib/customer-name";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { getAllowedCountries } from "~/lib/geo/regions";
import { PLATFORM_TERMS_VERSION } from "~/lib/legal/policy-versions";
import { getClientIp, subscriptionCheckoutLimiter } from "~/lib/rate-limit";
import { createSubscriptionCheckoutSession } from "~/lib/subscriptions/checkout-session";
import {
  ensureStripeCustomer,
  upsertLocalCustomer,
} from "~/lib/subscriptions/customer";
import {
  getInterval,
  parseProductIntervals,
} from "~/lib/subscriptions/intervals";
import {
  computeSubscriptionQuote,
  SubscriptionPricingError,
} from "~/lib/subscriptions/pricing";
import { quoteSubscriptionShipping } from "~/lib/subscriptions/shipping";
import { normalizeEmail } from "~/lib/utils";
import { subscriptionCheckoutBodySchema } from "~/lib/validators/subscription";
import { resolveVariantPrice } from "~/lib/variant-price";
import { db } from "~/server/db";

/**
 * `POST /api/stripe/subscriptions/create-session` — the money endpoint of the
 * Subscribe lane.
 *
 * A deliberate PARALLEL of `src/app/api/stripe/create-session/route.ts`, not a
 * branch inside it: the one-time checkout path is not modified by this feature
 * at all. Conventions are shared on purpose (host-header tenant resolution, a
 * per-IP limiter, shopper-safe error strings, an httpOnly pending-session
 * cookie, server-derived prices), because an owner debugging one should
 * recognize the other.
 *
 * Three things make this route different from one-time checkout:
 *
 *  1. **No inventory reservation.** A subscription bills on a cycle; holding
 *     stock at signup would keep it away from other shoppers indefinitely.
 *     Stock is checked here and immediately released — deduction happens per
 *     paid invoice, in the webhook.
 *  2. **The destination is frozen.** Stripe forbids `shipping_options` in
 *     subscription mode, so shipping is priced here, once, from the address the
 *     shopper typed, and billed as a recurring line item forever after.
 *  3. **A `Subscription` row exists before Stripe does.** It is created
 *     `incomplete` so the webhook has something to attach to, and deleted again
 *     if Stripe rejects the session — an orphaned `incomplete` row would sit in
 *     the owner's admin list and the cron sweep forever, for a subscription
 *     that never existed.
 *
 * Nothing about price comes from the client. The body carries ids, a cadence
 * key, a quantity, a delivery method and contact details; the unit price,
 * discount, shipping and every Stripe parameter are derived server-side.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Owner-fault blocks → Sentry
// ─────────────────────────────────────────────────────────────────────────────
//
// Same reasoning (and the same throttle) as `reportCheckoutBlocked` in the
// one-time route, which is deliberately not imported: that module is on the
// §12 zero-diff list, and exporting its private helper would be an edit to it.
//
// A store misconfiguration rejects EVERY shopper, so unthrottled this would
// bill one event per attempt for as long as the store stays broken. The signal
// worth acting on is "subscriptions are blocked for this store, for this
// reason" — one event per store+reason per 15 minutes keeps the issue's
// `lastSeen` honest while capping the volume.
const BLOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_BLOCKS = 500;
const lastBlockReport = new Map<string, number>();

function reportSubscriptionBlocked(
  reason: string,
  ctx: {
    businessId?: string;
    templateId?: string;
    /** Stands in as the throttle identity for branches that run before tenant resolution. */
    host?: string;
    extra?: Record<string, unknown>;
  },
): void {
  const key = `${ctx.businessId ?? ctx.host ?? "unknown"}:${reason}`;
  const now = Date.now();
  if (now - (lastBlockReport.get(key) ?? 0) < BLOCK_WINDOW_MS) return;
  if (lastBlockReport.size >= MAX_TRACKED_BLOCKS) lastBlockReport.clear();
  lastBlockReport.set(key, now);

  Sentry.captureMessage(`Subscription checkout blocked: ${reason}`, {
    level: "error",
    tags: {
      route: "stripe.subscriptions.create-session",
      "checkout.block": reason,
      "checkout.fault": "owner",
      ...(ctx.businessId ? { businessId: ctx.businessId } : {}),
      ...(ctx.templateId ? { templateId: ctx.templateId } : {}),
    },
    extra: ctx.extra,
  });
}

/** Address fields required for a `ship` subscription. Names only in Sentry — never values (PII). */
const REQUIRED_SHIPPING_FIELDS = [
  "line1",
  "city",
  "state",
  "postalCode",
] as const;

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

/**
 * Trim the submitted email before validation.
 *
 * `subscriptionCheckoutBodySchema` uses a bare `z.string().email()` (deliberate
 * parity with the one-time checkout schema) and zod's email pattern is
 * anchored, so an address carrying a stray leading/trailing space — autofill,
 * a paste, a phone keyboard — fails the parse outright and the shopper gets an
 * opaque "Invalid request." naming no field. Trimming at the edge fixes that
 * without changing a schema the storefront form also compiles against. The
 * value is lower-cased later by `normalizeEmail` before it reaches the DB.
 */
function withTrimmedEmail(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const body = raw as { customerInfo?: unknown };
  const info = body.customerInfo;
  if (typeof info !== "object" || info === null) return raw;
  const email = (info as { email?: unknown }).email;
  if (typeof email !== "string") return raw;
  return { ...body, customerInfo: { ...info, email: email.trim() } };
}

export async function POST(req: Request) {
  // Diagnostic snapshot for the outer catch: `business` and the resolved
  // product are scoped inside the try, so they are unreachable where a 500 is
  // reported. Filled in as each becomes known; never influences a response.
  const errorContext: Record<string, unknown> = {};

  try {
    const parsed = subscriptionCheckoutBodySchema.safeParse(
      withTrimmedEmail(await req.json()),
    );
    if (!parsed.success) {
      // The highest-value report here: `parsed.error` is otherwise discarded
      // and the shopper gets a bare "Invalid request.", so a Subscribe form
      // posting a malformed body takes the store to zero subscriptions with no
      // trace. `flatten()` names the offending field and carries no values.
      const host = req.headers.get("host");
      reportSubscriptionBlocked("invalid-request-body", {
        host: host ?? undefined,
        extra: { host, issues: parsed.error.flatten() },
      });
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const body = parsed.data;
    const { customerInfo } = body;

    try {
      await subscriptionCheckoutLimiter.consume(getClientIp(req));
    } catch {
      // Not reported: a 429 is the limiter working as designed.
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const domain = getCurrentDomain(req.headers);
    const business = await getBusinessByDomain(domain);

    if (!business?.stripeAccountId) {
      // Subscriptions are billed as direct charges on the store's own account.
      // Without Connect onboarding there is nowhere for the money to go, and
      // the storefront gives no hint of it.
      reportSubscriptionBlocked("stripe-not-connected", {
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
    errorContext.stripeAutoTaxEnabled = business.stripeAutoTaxEnabled;

    // Hiding the Subscribe panel is not a security boundary — this endpoint is
    // POST-able directly. `subscriptions` also depends on `products` +
    // `payments`, so switching off a PARENT cascades this closed; the admin UI
    // shows the parent toggled off, not "you have stopped taking subscriptions".
    const { isEnabled, disabledByDependency } = resolveFlags(
      business.featureFlags,
    );
    if (!isEnabled("subscriptions")) {
      reportSubscriptionBlocked("feature-disabled", {
        businessId: business.id,
        templateId: business.templateId,
        extra: {
          viaDependencyCascade: disabledByDependency.includes("subscriptions"),
          disabledByDependency,
        },
      });
      return NextResponse.json(
        { error: "Subscriptions are not available for this store." },
        { status: 403 },
      );
    }

    // Scoped by business AND published: an unpublished product is not
    // purchasable, one-time or recurring.
    const product = await db.product.findFirst({
      where: { id: body.productId, businessId: business.id, published: true },
      include: {
        variants: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            inventoryQty: true,
            reservedQty: true,
          },
        },
        images: {
          select: { url: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    errorContext.productId = product.id;

    const intervals = parseProductIntervals(product.subscriptionIntervals);
    if (!product.subscriptionEnabled || intervals.length === 0) {
      return NextResponse.json(
        { error: "This product is not available for subscription." },
        { status: 400 },
      );
    }
    if (!intervals.includes(body.intervalKey)) {
      return NextResponse.json(
        { error: "That delivery schedule is not available for this product." },
        { status: 400 },
      );
    }
    // Guaranteed present: `intervals` is filtered against the same catalog.
    const cadence = getInterval(body.intervalKey);
    if (!cadence) {
      return NextResponse.json(
        { error: "That delivery schedule is not available for this product." },
        { status: 400 },
      );
    }

    // Variant resolution, kept ahead of the availability check so the shopper
    // gets "choose an option" rather than a generic "unavailable".
    const requestedVariantId = body.variantId?.trim() ?? "";
    if (product.variants.length > 0 && !requestedVariantId) {
      return NextResponse.json(
        { error: "Please choose an option before subscribing." },
        { status: 400 },
      );
    }
    const variant = requestedVariantId
      ? (product.variants.find((v) => v.id === requestedVariantId) ?? null)
      : null;
    if (requestedVariantId && !variant) {
      // Either another product's variant or a stale id from a cached page.
      return NextResponse.json(
        { error: "Please choose an available option." },
        { status: 400 },
      );
    }

    // Availability at signup, via the same helper the one-time cart uses —
    // deliberately WITHOUT creating an `InventoryReservation`. See the module
    // docblock: a subscription must not hold stock away from other shoppers.
    const line = {
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.name,
      variantName: variant?.name ?? null,
      quantity: body.quantity,
    };
    const variantMap = new Map<string, VariantAvailability>(
      variant
        ? [
            [
              variant.id,
              {
                price: variant.price,
                inventoryQty: variant.inventoryQty,
                reservedQty: variant.reservedQty,
                product: {
                  price: product.price,
                  published: product.published,
                  trackInventory: product.trackInventory,
                  allowBackorders: product.allowBackorders,
                  additionalFields: product.additionalFields,
                },
              },
            ],
          ]
        : [],
    );
    const productMap = new Map<string, ProductAvailability>([
      [
        product.id,
        {
          price: product.price,
          published: product.published,
          trackInventory: product.trackInventory,
          allowBackorders: product.allowBackorders,
          inventoryQty: product.inventoryQty,
          reservedQty: product.reservedQty,
          additionalFields: product.additionalFields,
          baseInventoryUnitId: product.baseInventoryUnitId,
          baseUnitsConsumed: product.baseUnitsConsumed,
          _count: { variants: product.variants.length },
        },
      ],
    ]);
    const poolDemand = computePoolDemand([line], productMap);
    const poolMap = new Map<string, PoolAvailability>(
      poolDemand.size > 0
        ? (
            await db.baseInventoryUnit.findMany({
              where: {
                id: { in: [...poolDemand.keys()] },
                businessId: business.id,
              },
              select: {
                id: true,
                inventoryQty: true,
                reservedQty: true,
                allowBackorders: true,
              },
            })
          ).map((p) => [p.id, p] as const)
        : [],
    );

    const { unavailableItems, unavailableDetails } = checkCartAvailability({
      items: [line],
      variantMap,
      productMap,
      poolDemand,
      poolMap,
    });
    if (unavailableItems.length > 0) {
      const reason = unavailableDetails[0]?.reason ?? "out-of-stock";
      // Plain scarcity is shopper-fault and deliberately silent (see
      // `isOwnerFaultReason`); everything else means the store cannot sell this
      // product to anyone until the owner fixes it.
      if (reason !== "out-of-stock") {
        reportSubscriptionBlocked("unavailable-item", {
          businessId: business.id,
          templateId: business.templateId,
          extra: {
            reason,
            productId: product.id,
            variantId: variant?.id ?? null,
          },
        });
      }
      return NextResponse.json(
        { error: "This item is out of stock or no longer available." },
        { status: 400 },
      );
    }

    const deliveryMethod = body.deliveryMethod === "pickup" ? "pickup" : "ship";
    errorContext.deliveryMethod = deliveryMethod;

    if (deliveryMethod === "pickup" && !business.offersInStorePickup) {
      reportSubscriptionBlocked("pickup-not-enabled", {
        businessId: business.id,
        templateId: business.templateId,
        extra: { offersInStorePickup: business.offersInStorePickup },
      });
      return NextResponse.json(
        { error: "In-store pickup is not available for this store" },
        { status: 400 },
      );
    }

    const sa = customerInfo.shippingAddress ?? null;
    const contactPhone = (customerInfo.phone ?? sa?.phone)?.trim() ?? "";
    const allowedCountries = getAllowedCountries(business.salesCountries);

    if (deliveryMethod === "ship") {
      if (
        !sa ||
        isBlank(sa.line1) ||
        isBlank(sa.city) ||
        isBlank(sa.state) ||
        isBlank(sa.postalCode) ||
        !allowedCountries.includes(sa.country as SupportedCountry)
      ) {
        // Field NAMES and the country code only — the shopper's actual address
        // is PII and never leaves the request.
        reportSubscriptionBlocked("incomplete-shipping-address", {
          businessId: business.id,
          templateId: business.templateId,
          extra: {
            hasShippingAddress: !!sa,
            blankAddressFields: sa
              ? REQUIRED_SHIPPING_FIELDS.filter((f) => isBlank(sa[f]))
              : [...REQUIRED_SHIPPING_FIELDS],
            requestedCountry: sa?.country ?? null,
            countryAllowed:
              !!sa && allowedCountries.includes(sa.country as SupportedCountry),
            allowedCountryCount: allowedCountries.length,
          },
        });
        return NextResponse.json(
          { error: "Complete shipping address is required" },
          { status: 400 },
        );
      }

      if (!contactPhone) {
        // A recurring delivery is a standing carrier commitment; the owner has
        // no other channel to reach the customer about a missed one.
        reportSubscriptionBlocked("missing-phone", {
          businessId: business.id,
          templateId: business.templateId,
        });
        return NextResponse.json(
          { error: "A phone number is required for delivery." },
          { status: 400 },
        );
      }
    }

    // Priced once, from this address, and frozen for the life of the
    // subscription — Stripe cannot re-quote shipping in subscription mode.
    const shippingCents =
      deliveryMethod === "pickup"
        ? 0
        : await quoteSubscriptionShipping(db, {
            businessId: business.id,
            productId: product.id,
            variantId: variant?.id ?? null,
            quantity: body.quantity,
            destinationState: sa?.state.trim() ?? "",
            destinationCountry: sa?.country ?? "",
            deliveryMethod,
          });

    const listPriceCents = variant
      ? resolveVariantPrice(variant.price, product.price)
      : product.price;

    let quote;
    try {
      quote = computeSubscriptionQuote({
        listPriceCents,
        discountPercent: product.subscriptionDiscountPercent,
        quantity: body.quantity,
        shippingCents,
      });
    } catch (pricingError) {
      if (pricingError instanceof SubscriptionPricingError) {
        // Owner-fault: a product priced under Stripe's $0.50 floor (or a
        // discount that pushes it there) can never be subscribed to, and the
        // owner has no other signal that the panel they enabled is dead.
        reportSubscriptionBlocked(`pricing-${pricingError.code}`, {
          businessId: business.id,
          templateId: business.templateId,
          extra: {
            productId: product.id,
            listPriceCents,
            discountPercent: product.subscriptionDiscountPercent,
            quantity: body.quantity,
          },
        });
        return NextResponse.json(
          { error: "This product is not available for subscription." },
          { status: 400 },
        );
      }
      throw pricingError;
    }

    // Merchant-terms acceptance is agreed on the Subscribe form (same contract
    // as an Order): `merchantTermsUpdatedAt` snapshots the terms page's
    // `updatedAt` so we can later tell which wording was in force. Isolated —
    // a lookup failure must never block the signup, it just means this row
    // records no `merchantTermsUpdatedAt`.
    let merchantTermsUpdatedAt: Date | null = null;
    try {
      const merchantTermsPage = await db.page.findUnique({
        where: {
          businessId_slug: {
            businessId: business.id,
            slug: "terms-of-service",
          },
          published: true,
        },
        select: { updatedAt: true },
      });
      merchantTermsUpdatedAt = merchantTermsPage?.updatedAt ?? null;
    } catch (termsLookupError) {
      Sentry.captureException(termsLookupError, {
        tags: {
          route: "stripe.subscriptions.create-session",
          "subscription.step": "merchant-terms-lookup",
          businessId: business.id,
        },
      });
    }

    const email = normalizeEmail(customerInfo.email);
    const shopperName = customerInfo.name.trim();
    const { firstName, lastName } = splitCustomerName(shopperName);
    const shipAddress =
      deliveryMethod === "ship" && sa
        ? {
            line1: sa.line1.trim(),
            line2: sa.line2?.trim() ? sa.line2.trim() : null,
            city: sa.city.trim(),
            state: sa.state.trim(),
            postalCode: sa.postalCode.trim(),
            country: sa.country,
          }
        : null;

    // Created BEFORE Stripe so its id can be stamped into
    // `subscription_data.metadata` — that metadata is what every future
    // invoice event carries, and it is the only way the webhook finds this row
    // months from now. Deleted again below if Stripe rejects the session.
    const row = await db.subscription.create({
      data: {
        businessId: business.id,
        customerEmail: email,
        customerName: shopperName || null,
        customerPhone: contactPhone || null,
        productId: product.id,
        productVariantId: variant?.id ?? null,
        productName: product.name,
        variantName: variant?.name ?? null,
        sku: variant?.sku ?? product.sku ?? null,
        quantity: body.quantity,
        intervalKey: body.intervalKey,
        interval: cadence.interval,
        intervalCount: cadence.intervalCount,
        listPriceCents,
        discountPercent: product.subscriptionDiscountPercent,
        unitAmountCents: quote.unitAmountCents,
        shippingCents: quote.shippingCents,
        deliveryMethod,
        // Encrypted snapshot of the locked destination. Kept alongside the
        // `shippingAddressId` FK because the address-book row may be edited or
        // deleted later without changing where a live subscription ships.
        shipFirstName: shipAddress ? firstName : null,
        shipLastName: shipAddress ? lastName : null,
        shipAddress1: shipAddress?.line1 ?? null,
        shipAddress2: shipAddress?.line2 ?? null,
        shipCity: shipAddress?.city ?? null,
        shipProvince: shipAddress?.state ?? null,
        shipZip: shipAddress?.postalCode ?? null,
        shipCountry: shipAddress?.country ?? null,
        status: "incomplete",
        termsAcceptedAt: new Date(),
        termsVersion: PLATFORM_TERMS_VERSION,
        merchantTermsUpdatedAt,
      },
    });
    errorContext.subscriptionId = row.id;

    try {
      const customer = await upsertLocalCustomer(db, {
        businessId: business.id,
        email,
        name: shopperName,
      });

      const shippingAddressId = shipAddress
        ? await findOrCreateShippingAddress({
            customerId: customer.id,
            firstName: firstName ?? "",
            lastName: lastName ?? "",
            address1: shipAddress.line1,
            address2: shipAddress.line2,
            city: shipAddress.city,
            province: shipAddress.state,
            zip: shipAddress.postalCode,
            country: shipAddress.country,
            phone: contactPhone || null,
          })
        : null;

      const stripeCustomerId = await ensureStripeCustomer(db, {
        business: {
          id: business.id,
          stripeAccountId: business.stripeAccountId,
        },
        customer,
        email,
        name: shopperName,
        phone: contactPhone || null,
        address: shipAddress,
      });

      const isDev = process.env.NODE_ENV === "development";
      const baseUrl = isDev
        ? `http://${domain}`
        : business.customDomain && business.domainStatus === "ACTIVE"
          ? `https://${business.customDomain}`
          : `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;

      const session = await createSubscriptionCheckoutSession({
        business: {
          id: business.id,
          stripeAccountId: business.stripeAccountId,
          stripeAutoTaxEnabled: business.stripeAutoTaxEnabled,
        },
        baseUrl,
        productSlug: product.slug,
        // Server-fetched, never client-supplied.
        imageUrl: product.images[0]?.url ?? null,
        stripeCustomerId,
        subscription: {
          id: row.id,
          productId: product.id,
          productVariantId: variant?.id ?? null,
          productName: product.name,
          variantName: variant?.name ?? null,
          sku: row.sku,
          quantity: row.quantity,
          intervalKey: body.intervalKey,
          interval: cadence.interval,
          intervalCount: cadence.intervalCount,
          unitAmountCents: quote.unitAmountCents,
          shippingCents: quote.shippingCents,
          deliveryMethod,
        },
      });

      await db.subscription.update({
        where: { id: row.id },
        data: {
          customerId: customer.id,
          shippingAddressId,
          stripeCustomerId,
          stripeCheckoutSessionId: session.id,
        },
      });

      const response = NextResponse.json({
        sessionUrl: session.url,
        sessionId: session.id,
      });
      // Read by `/subscribe/success` to prove the visitor is the one who
      // started this checkout before any subscription detail is shown. Must
      // be `lax`, not `strict`: the browser lands here via a cross-site
      // top-level GET redirect from checkout.stripe.com, and `strict` cookies
      // are never sent on cross-site navigations — the one-time
      // `pending_session` cookie stays `strict` because it's read via a
      // same-site client fetch to `/api/stripe/session`, not a redirect.
      response.cookies.set("pending_subscription_session", session.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600,
      });
      return response;
    } catch (stripeErr) {
      // Roll the placeholder back. An `incomplete` row with no Stripe
      // subscription behind it would show up in the owner's admin list and be
      // swept by the cron job forever, for a signup that never happened.
      try {
        await db.subscription.delete({ where: { id: row.id } });
      } catch (cleanupErr) {
        Sentry.captureException(cleanupErr, {
          tags: {
            route: "stripe.subscriptions.create-session",
            "subscription.step": "cleanup-incomplete-row",
            businessId: business.id,
          },
          extra: { subscriptionId: row.id },
        });
      }

      Sentry.captureException(stripeErr, {
        tags: {
          route: "stripe.subscriptions.create-session",
          service: "stripe",
          "subscription.step": "checkout-create",
          businessId: business.id,
          templateId: business.templateId,
        },
        extra: errorContext,
      });
      return NextResponse.json(
        { error: "Failed to start subscription checkout. Please try again." },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    console.error("Create subscription checkout session error:", error);
    Sentry.withScope((scope) => {
      scope.setTag("route", "stripe.subscriptions.create-session");
      scope.setExtras(errorContext);
      // Also as tags: extras are not searchable, and the whole point is that
      // one `businessId:<id>` query returns both the blocked-checkout messages
      // above and the 500s from down here.
      if (typeof errorContext.businessId === "string") {
        scope.setTag("businessId", errorContext.businessId);
      }
      if (typeof errorContext.templateId === "string") {
        scope.setTag("templateId", errorContext.templateId);
      }
      Sentry.captureException(error);
    });
    return NextResponse.json(
      { error: "Failed to start subscription checkout. Please try again." },
      { status: 500 },
    );
  }
}
