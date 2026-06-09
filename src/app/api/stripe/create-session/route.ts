import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { validateAndComputeDiscount } from "~/lib/discount-validation";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { checkoutLimiter, getClientIp } from "~/lib/rate-limit";
import {
  calculateShipping,
  shippingConfigFromBusiness,
} from "~/lib/shipping-utils";
import { stripeClient } from "~/lib/stripe/client";
import { db } from "~/server/db";

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
    const body = (await req.json()) as {
      items: {
        productId: string;
        variantId: string | null;
        productName: string;
        variantName: string | null;
        price: number;
        quantity: number;
        imageUrl: string | null;
        sku?: string;
      }[];
      customerInfo: {
        email: string;
        name: string;
        /** Contact phone; prefills Stripe Checkout when `phone_number_collection` is enabled. */
        phone?: string | null;
        shippingAddress?: {
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postalCode: string;
          country: string;
          phone?: string | null;
        } | null;
      };
      discountCodeId?: string | null;
      deliveryMethod?: "ship" | "pickup";
    };

    const { items, customerInfo, discountCodeId } = body;

    if (!items || !customerInfo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

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

    // Validate cart: all items must exist, be published, and be in stock
    const itemList = Array.isArray(items) ? items : [];
    if (itemList.length === 0) {
      return NextResponse.json(
        { error: "Your cart is empty" },
        { status: 400 },
      );
    }

    const MAX_QUANTITY_PER_ITEM = 100;
    if (
      itemList.some(
        (i) =>
          !Number.isInteger(i.quantity) ||
          i.quantity < 1 ||
          i.quantity > MAX_QUANTITY_PER_ITEM,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid item quantity." },
        { status: 400 },
      );
    }

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
    const poolDemand = new Map<string, number>();
    for (const item of itemList) {
      if (!item.variantId) {
        const p = productMap.get(item.productId);
        if (p?.baseInventoryUnitId) {
          const cur = poolDemand.get(p.baseInventoryUnitId) ?? 0;
          poolDemand.set(
            p.baseInventoryUnitId,
            cur + (p.baseUnitsConsumed ?? 1) * (Number(item.quantity) || 1),
          );
        }
      }
    }

    const poolIds = [...poolDemand.keys()];
    const pools =
      poolIds.length > 0
        ? await db.baseInventoryUnit.findMany({
            where: { id: { in: poolIds }, businessId: business.id },
            select: { id: true, inventoryQty: true, allowBackorders: true },
          })
        : [];
    const poolMap = new Map(pools.map((p) => [p.id, p]));

    const unavailableItems: string[] = [];
    const unavailableItemIds: {
      productId: string;
      variantId: string | null;
    }[] = [];
    const unavailableIdKeySet = new Set<string>();

    const pushUnavailable = (
      name: string,
      productId: string,
      variantId: string | null,
    ) => {
      unavailableItems.push(name);
      const key = `${productId}-${variantId ?? "base"}`;
      if (!unavailableIdKeySet.has(key)) {
        unavailableIdKeySet.add(key);
        unavailableItemIds.push({ productId, variantId });
      }
    };

    for (const item of itemList) {
      const name = item.variantName
        ? `${item.productName} (${item.variantName})`
        : item.productName;
      const qty = Number(item.quantity) || 1;

      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant?.product.published) {
          pushUnavailable(name, item.productId, item.variantId);
          continue;
        }
        const variantProductFields = variant.product.additionalFields as Record<
          string,
          unknown
        > | null;
        if (variantProductFields?.comingSoon === true) {
          pushUnavailable(name, item.productId, item.variantId);
          continue;
        }
        if (
          variant.product.trackInventory &&
          !variant.product.allowBackorders &&
          variant.inventoryQty < qty
        ) {
          pushUnavailable(name, item.productId, item.variantId);
          continue;
        }
      } else {
        const product = productMap.get(item.productId);
        if (!product?.published) {
          pushUnavailable(name, item.productId, null);
          continue;
        }
        if (product._count.variants > 0) {
          pushUnavailable(name, item.productId, null);
          continue;
        }
        const productFields = product.additionalFields as Record<
          string,
          unknown
        > | null;
        if (productFields?.comingSoon === true) {
          pushUnavailable(name, item.productId, null);
          continue;
        }
        // Pool inventory check — pool demand is validated in aggregate after the loop
        if (!product.baseInventoryUnitId) {
          if (
            product.trackInventory &&
            !product.allowBackorders &&
            product.inventoryQty < qty
          ) {
            pushUnavailable(name, item.productId, null);
          }
        }
      }
    }

    // Aggregate pool check: compare total pool demand vs available qty
    for (const [poolId, demand] of poolDemand) {
      const pool = poolMap.get(poolId);
      if (!pool || (!pool.allowBackorders && pool.inventoryQty < demand)) {
        // Mark all items drawing from this pool as unavailable
        for (const item of itemList) {
          if (!item.variantId) {
            const p = productMap.get(item.productId);
            if (p?.baseInventoryUnitId === poolId) {
              const n = item.variantName
                ? `${item.productName} (${item.variantName})`
                : item.productName;
              pushUnavailable(n, item.productId, null);
            }
          }
        }
      }
    }

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
    const subtotalCents = itemList.reduce((sum, item) => {
      const serverPrice = item.variantId
        ? (variantMap.get(item.variantId)?.price ?? 0)
        : (productMap.get(item.productId)?.price ?? 0);
      return sum + serverPrice * item.quantity;
    }, 0);

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

    // Create Stripe Checkout session
    const session = await stripeClient.checkout.sessions.create(sessionParams, {
      stripeAccount: business.stripeAccountId, // Connect to store's Stripe account
    });

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
