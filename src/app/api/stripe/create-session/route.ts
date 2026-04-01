import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

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
          allowBackorders: true,
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
        if (
          product.trackInventory &&
          !product.allowBackorders &&
          product.inventoryQty < qty
        ) {
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
    // TODO: Fix so that the price is looked up serverside and not client side (variant?.price ?? product.price for unit amount)
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

    const sa = customerInfo.shippingAddress;
    const contactPhone =
      (customerInfo.phone ?? sa?.phone)?.trim() ?? "";
    const hasFullShipping =
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

    // Always collect shipping on Stripe (visible + editable). Prefill comes from the
    // Stripe Customer’s shipping when `customer` is set — Stripe does not allow
    // `payment_intent_data.shipping` together with `shipping_address_collection`.
    // Phone: `phone_number_collection` shows the field on Checkout; Customer.phone prefills it.
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
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        businessId: business.id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        discountCodeId: discountCodeId || "",
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
