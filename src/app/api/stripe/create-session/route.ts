// import { NextRequest, NextResponse } from "next/server";
// import Stripe from "stripe";
// import { prisma } from "~/server/db";

// export async function POST(req: NextRequest) {
//   try {
//     const { businessId, items, customerInfo } = await req.json();

//     if (!businessId || !items || !customerInfo) {
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 },
//       );
//     }

//     // Get business with Stripe account
//     const business = await prisma.business.findUnique({
//       where: { id: businessId },
//       select: {
//         stripeAccountId: true,
//         name: true,
//         subdomain: true,
//         customDomain: true,
//       },
//     });

//     if (!business || !business.stripeAccountId) {
//       return NextResponse.json(
//         { error: "Store payment processing not configured" },
//         { status: 400 },
//       );
//     }

//     // Initialize Stripe with platform account
//     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//       apiVersion: "2024-11-20.acacia",
//     });

//     // Create line items for Stripe
//     const lineItems = items.map((item: any) => ({
//       price_data: {
//         currency: "usd",
//         product_data: {
//           name: item.productName,
//           description: item.variantName || undefined,
//           images: item.imageUrl ? [item.imageUrl] : undefined,
//         },
//         unit_amount: item.price,
//       },
//       quantity: item.quantity,
//     }));

//     // Determine success/cancel URLs
//     const isDev = process.env.NODE_ENV === "development";
//     const baseUrl = isDev
//       ? `http://${business.subdomain}.localhost:3000`
//       : business.customDomain
//         ? `https://${business.customDomain}`
//         : `https://${business.subdomain}.myapplication.com`;

//     // Create Stripe Checkout session
//     const session = await stripe.checkout.sessions.create(
//       {
//         mode: "payment",
//         line_items: lineItems,
//         success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
//         cancel_url: `${baseUrl}/checkout`,
//         customer_email: customerInfo.email,
//         shipping_address_collection: {
//           allowed_countries: ["US", "CA"],
//         },
//         metadata: {
//           businessId,
//           customerName: customerInfo.name,
//           customerEmail: customerInfo.email,
//         },
//       },
//       {
//         stripeAccount: business.stripeAccountId, // Connect to store's Stripe account
//       },
//     );

//     return NextResponse.json({ sessionUrl: session.url });
//   } catch (error: any) {
//     console.error("Create checkout session error:", error);
//     return NextResponse.json(
//       { error: error.message || "Failed to create checkout session" },
//       { status: 500 },
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "~/server/db";

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
    const { businessId, items, customerInfo, discountCodeId, discountAmount } =
      await req.json();

    if (!businessId || !items || !customerInfo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get business with Stripe account
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        stripeAccountId: true,
        name: true,
        subdomain: true,
        customDomain: true,
      },
    });

    if (!business || !business.stripeAccountId) {
      return NextResponse.json(
        { error: "Store payment processing not configured" },
        { status: 400 },
      );
    }

    // Validate cart: all items must exist, be published, and be in stock
    const itemList = Array.isArray(items) ? (items as any[]) : [];
    if (itemList.length === 0) {
      return NextResponse.json(
        { error: "Your cart is empty" },
        { status: 400 },
      );
    }

    const variantIds = [
      ...new Set(
        itemList
          .map((i: any) => i.variantId)
          .filter((id: unknown): id is string => !!id),
      ),
    ] as string[];
    const productIds = [
      ...new Set(itemList.map((i: any) => i.productId).filter(Boolean)),
    ] as string[];

    const [variantsWithProduct, productsNoVariant] = await Promise.all([
      variantIds.length > 0
        ? prisma.productVariant.findMany({
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
      prisma.product.findMany({
        where: {
          id: { in: productIds },
          businessId,
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
        .filter((v) => v.product.businessId === businessId)
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
        if (!product || !product.published) {
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
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-11-20.acacia",
    });

    // Create line items for Stripe (metadata so webhook can store product/variant and deduct inventory)
    const lineItems = itemList.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.productName,
          description: item.variantName || undefined,
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
    const baseUrl = isDev
      ? `http://${business.subdomain}.localhost:3000`
      : business.customDomain
        ? `https://${business.customDomain}`
        : `https://${business.subdomain}.myapplication.com`;

    // Build session params
    const sessionParams: any = {
      mode: "payment",
      line_items: lineItems,
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      customer_email: customerInfo.email,
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      metadata: {
        businessId,
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
            stripe,
            business.stripeAccountId!,
            discountAmount,
          ),
        },
      ];
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: business.stripeAccountId, // Connect to store's Stripe account
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error: any) {
    console.error("Create checkout session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
