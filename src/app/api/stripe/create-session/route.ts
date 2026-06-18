import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import type { ReservationEntry } from "~/lib/inventory/reservation";
import { env } from "~/env";
import { computeSubtotalCents } from "~/lib/checkout/pricing";
import {
  checkCartAvailability,
  computePoolDemand,
} from "~/lib/checkout/validate-cart";
import { validateAndComputeDiscount } from "~/lib/discount-validation";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import {
  releaseReservation,
  reserveInventory,
} from "~/lib/inventory/reservation";
import { getPlatformMaintenance } from "~/lib/maintenance";
import { checkoutLimiter, getClientIp } from "~/lib/rate-limit";
import {
  calculateShipping,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { stripeClient } from "~/lib/stripe/client";
import { checkoutSessionSchema } from "~/lib/validators/checkout";
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
      const stale = await db.inventoryReservation.findMany({
        where: {
          businessId: business.id,
          status: "active",
          expiresAt: { lt: new Date() },
        },
        take: 50,
      });
      for (const stalRes of stale) {
        await db.$transaction(async (tx) => {
          const entries = stalRes.items as ReservationEntry[];
          await releaseReservation(tx, { items: entries });
          await tx.inventoryReservation.update({
            where: { id: stalRes.id },
            data: { status: "released" },
          });
        });
      }
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
        (saPre.country !== "US" && saPre.country !== "CA")
      ) {
        return NextResponse.json(
          { error: "Complete shipping address is required" },
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

      const computed = validateAndComputeDiscount(discountRow, subtotalCents);
      if (!computed.ok) {
        return NextResponse.json({ error: computed.error }, { status: 400 });
      }

      discountCents = computed.discountAmountCents;
      verifiedDiscountCodeId = discountRow.id;
    }

    const shippingConfig = shippingConfigFromBusiness({
      shippingType: business.shippingType,
      shippingFlatRate: business.shippingFlatRate,
      freeShippingThreshold: business.freeShippingThreshold,
      offersInStorePickup: business.offersInStorePickup,
    });

    let shippingCents = 0;
    let shippingDisplayName = "Shipping";
    if (deliveryMethod === "pickup") {
      shippingCents = 0;
      shippingDisplayName = "In-Store Pickup";
    } else {
      shippingCents = calculateShipping(subtotalCents, shippingConfig);
      shippingDisplayName =
        shippingCents === 0 ? "Free shipping" : "Standard shipping";
    }

    // Initialize Stripe with platform account

    // Create line items for Stripe (metadata so webhook can store product/variant and deduct inventory)
    const lineItems = itemList.map((item) => {
      // Always use server-fetched prices — never trust client-supplied amounts
      const variantRecord = item.variantId
        ? variantMap.get(item.variantId)
        : undefined;
      const productRecord = productMap.get(item.productId);
      const serverPrice = variantRecord?.price ?? productRecord?.price;

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
      (sa.country === "US" || sa.country === "CA") &&
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

    // Shipping: `shipping_options` sets the amount Stripe charges (Connect webhook reads `amount_shipping`).
    // Address collection only when shipping to customer (not in-store pickup).
    // Phone: `phone_number_collection` prefills when Customer.phone is set.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems,
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      ...(stripeCustomerId
        ? {
            customer: stripeCustomerId,
            customer_update: {
              shipping: "auto",
            },
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
      ...(deliveryMethod === "ship"
        ? {
            shipping_address_collection: {
              allowed_countries: ["US", "CA"],
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
