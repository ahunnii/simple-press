import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import type { SupportedCountry } from "~/lib/geo/regions";
import type { ReservationEntry } from "~/lib/inventory/reservation";
import { env } from "~/env";
import { computeSubtotalCents } from "~/lib/checkout/pricing";
import {
  checkCartAvailability,
  computePoolDemand,
} from "~/lib/checkout/validate-cart";
import { validateAndComputeDiscount } from "~/lib/discount-validation";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { getAllowedCountries } from "~/lib/geo/regions";
import {
  releaseReservation,
  reserveInventory,
  sweepStaleReservations,
} from "~/lib/inventory/reservation";
import { getPlatformMaintenance } from "~/lib/maintenance";
import { checkoutLimiter, getClientIp } from "~/lib/rate-limit";
import { normalizeEmail } from "~/lib/utils";
import { buildZoneWeightConfig } from "~/lib/shipping-config";
import {
  calculateShipping,
  calculateZoneWeightShipping,
  normalizeWeightToLb,
  SHIPPING_TYPES,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { shouldPinPaymentIntentShipping } from "~/lib/checkout/shipping";
import { stripeClient } from "~/lib/stripe/client";
import { checkoutSessionSchema } from "~/lib/validators/checkout";
import { resolveVariantPrice } from "~/lib/variant-price";
import { db } from "~/server/db";

// Thrown inside the reservation transaction to force a rollback when stock
// can't be held; caught by the POST handler to return a 400. Throwing (rather
// than returning) is required so Prisma rolls back any partial reservedQty
// increments made earlier in the reserve loop.
class OutOfStockError extends Error {}

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
  try {
    const parsed = checkoutSessionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const body = parsed.data;
    const { items, customerInfo, discountCodeId } = body;

    try {
      await checkoutLimiter.consume(getClientIp(req));
    } catch {
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
      return NextResponse.json(
        { error: "Store payment processing not configured" },
        { status: 400 },
      );
    }

    // Maintenance guard: reject checkout while platform or store is in maintenance.
    const platformMaintenance = await getPlatformMaintenance();
    if (platformMaintenance.active || business.maintenanceMode) {
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

    const { unavailableItems, unavailableItemIds } = checkCartAvailability({
      items: itemList,
      variantMap,
      productMap,
      poolDemand,
      poolMap,
    });

    if (unavailableItems.length > 0) {
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

    if (deliveryMethod === "pickup" && !business.offersInStorePickup) {
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
        return NextResponse.json(
          { error: "Complete shipping address is required" },
          { status: 400 },
        );
      }

      // Extra guard for zone_weight orders: the address is locked to what was
      // entered in our form (Stripe won't re-collect it). Reject here if the
      // country is not in the business's allowed list so a bad actor can't
      // POST a disallowed country that Stripe would otherwise accept.
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

    const rawDiscountId =
      typeof discountCodeId === "string" && discountCodeId.trim() !== ""
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
      secure: true,
      maxAge: 3600,
    });
    return response;
  } catch (error: unknown) {
    console.error("Create checkout session error:", error);
    Sentry.withScope((scope) => {
      scope.setTag("route", "stripe.create-session");
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
