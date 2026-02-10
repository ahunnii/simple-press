import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { env } from "~/env";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
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
    const { items, customerInfo, discountCodeId, discountAmount } =
      (await req.json()) as {
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
        };
        discountCodeId: string;
        discountAmount: number;
      };

    if (!items || !customerInfo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
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
            where: { id: { in: variantIds } },
            select: {
              id: true,
              inventoryQty: true,
              name: true,
              productId: true,
              product: {
                select: { businessId: true, published: true },
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
          published: true,
          trackInventory: true,
          inventoryQty: true,
          _count: { select: { variants: true } },
        },
      }),
    ]);

    const variantMap = new Map(
      variantsWithProduct
        .filter((v) => v.product.businessId === business.id)
        .map((v) => [v.id, v]),
    );
    const productMap = new Map(productsNoVariant.map((p) => [p.id, p]));

    const unavailableItems: string[] = [];
    for (const item of itemList) {
      const name = item.variantName
        ? `${item.productName} (${item.variantName})`
        : item.productName;
      const qty = Number(item.quantity) || 1;

      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (
          !variant ||
          !variant.product.published ||
          variant.inventoryQty < qty
        ) {
          unavailableItems.push(name);
          continue;
        }
      } else {
        const product = productMap.get(item.productId);
        if (!product?.published) {
          unavailableItems.push(name);
          continue;
        }
        if (product._count.variants > 0) {
          unavailableItems.push(name);
          continue;
        }
        if (product.trackInventory && product.inventoryQty < qty) {
          unavailableItems.push(name);
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
        },
        { status: 400 },
      );
    }

    // Initialize Stripe with platform account

    // Create line items for Stripe (metadata so webhook can store product/variant and deduct inventory)
    const lineItems = itemList.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.productName,
          description: item.variantName ?? undefined,
          images: item.imageUrl ? [item.imageUrl] : undefined,
          metadata: {
            productId: String(item.productId ?? ""),
            productVariantId: String(item.variantId ?? ""),
            variantName: String(item.variantName ?? ""),
            sku: String(item.sku ?? ""),
          },
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    // Determine success/cancel URLs
    const isDev = process.env.NODE_ENV === "development";
    const platformDomain = env.NEXT_PUBLIC_PLATFORM_DOMAIN;
    const baseUrl = isDev
      ? `http://${domain}`
      : business.customDomain && business.domainStatus === "ACTIVE"
        ? `https://${business.customDomain}`
        : `https://${business.subdomain}.${platformDomain}`;

    // Build session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems,
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      customer_email: customerInfo.email,
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      metadata: {
        businessId: business.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        discountCodeId: discountCodeId || "",
      },
    };

    // Add discount if applicable
    if (discountAmount && discountAmount > 0) {
      sessionParams.discounts = [
        {
          coupon: await createStripeCoupon(
            stripeClient,
            business.stripeAccountId,
            discountAmount,
          ),
        },
      ];
    }

    // Create Stripe Checkout session
    const session = await stripeClient.checkout.sessions.create(sessionParams, {
      stripeAccount: business.stripeAccountId, // Connect to store's Stripe account
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error: unknown) {
    console.error("Create checkout session error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      },
      { status: 500 },
    );
  }
}
