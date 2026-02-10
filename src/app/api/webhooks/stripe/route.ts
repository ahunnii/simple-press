// import { NextRequest, NextResponse } from "next/server";
// import Stripe from "stripe";
// import { prisma } from "~/server/db";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2024-11-20.acacia",
// });

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.text();
//     const signature = req.headers.get("stripe-signature");

//     if (!signature) {
//       return NextResponse.json({ error: "No signature" }, { status: 400 });
//     }

//     // Verify webhook signature
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
//     let event: Stripe.Event;

//     try {
//       event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
//     } catch (err: any) {
//       console.error("Webhook signature verification failed:", err.message);
//       return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
//     }

//     // Handle the event
//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object as Stripe.Checkout.Session;

//       // Get business ID from metadata
//       const businessId = session.metadata?.businessId;

//       if (!businessId) {
//         console.error("No businessId in session metadata");
//         return NextResponse.json({ received: true });
//       }

//       // Retrieve full session with line items
//       const fullSession = await stripe.checkout.sessions.retrieve(
//         session.id,
//         {
//           expand: ["line_items"],
//         },
//         {
//           stripeAccount: session.metadata?.stripeAccountId,
//         },
//       );

//       // Create order in database
//       const order = await prisma.order.create({
//         data: {
//           businessId,
//           customerEmail:
//             session.customer_email ||
//             session.customer_details?.email ||
//             "unknown@example.com",
//           customerName:
//             session.metadata?.customerName ||
//             session.customer_details?.name ||
//             "Unknown",

//           // Amounts in cents
//           subtotal: session.amount_subtotal || 0,
//           tax: session.total_details?.amount_tax || 0,
//           shipping: session.total_details?.amount_shipping || 0,
//           total: session.amount_total || 0,

//           currency: session.currency || "usd",
//           status: "paid",
//           paymentStatus: session.payment_status,

//           // Shipping details
//           shippingAddress: session.shipping_details?.address
//             ? JSON.stringify(session.shipping_details.address)
//             : null,
//           shippingName: session.shipping_details?.name || null,

//           // Stripe reference
//           stripeSessionId: session.id,
//           stripePaymentIntentId: session.payment_intent as string,

//           // Order items
//           items: {
//             create:
//               fullSession.line_items?.data.map((item) => ({
//                 productName: item.description || "Unknown Product",
//                 quantity: item.quantity || 1,
//                 price: item.price?.unit_amount || 0,
//                 total: item.amount_total,
//               })) || [],
//           },
//         },
//         include: {
//           items: true,
//         },
//       });

//       console.log("Order created:", order.id);

//       // TODO: Send confirmation email
//       // TODO: Update inventory
//       // TODO: Notify store owner
//     }

//     return NextResponse.json({ received: true });
//   } catch (error: any) {
//     console.error("Webhook error:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// import { NextRequest, NextResponse } from "next/server";
// import Stripe from "stripe";
// import { prisma } from "~/server/db";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2024-11-20.acacia",
// });

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.text();
//     const signature = req.headers.get("stripe-signature");

//     if (!signature) {
//       return NextResponse.json({ error: "No signature" }, { status: 400 });
//     }

//     // Verify webhook signature
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
//     let event: Stripe.Event;

//     try {
//       event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
//     } catch (err: any) {
//       console.error("Webhook signature verification failed:", err.message);
//       return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
//     }

//     // Handle the event
//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object as Stripe.Checkout.Session;

//       // Get business ID from metadata
//       const businessId = session.metadata?.businessId;
//       const discountCodeId = session.metadata?.discountCodeId;

//       if (!businessId) {
//         console.error("No businessId in session metadata");
//         return NextResponse.json({ received: true });
//       }

//       // Retrieve full session with line items
//       const fullSession = await stripe.checkout.sessions.retrieve(
//         session.id,
//         {
//           expand: ["line_items", "total_details"],
//         },
//         {
//           stripeAccount: session.metadata?.stripeAccountId,
//         },
//       );

//       // Calculate discount amount from total_details
//       const discountAmount = fullSession.total_details?.amount_discount || 0;

//       // Create order in database
//       const order = await prisma.order.create({
//         data: {
//           businessId,
//           customerEmail:
//             session.customer_email ||
//             session.customer_details?.email ||
//             "unknown@example.com",
//           customerName:
//             session.metadata?.customerName ||
//             session.customer_details?.name ||
//             "Unknown",

//           // Amounts in cents
//           subtotal: session.amount_subtotal || 0,
//           tax: session.total_details?.amount_tax || 0,
//           shipping: session.total_details?.amount_shipping || 0,
//           discount: discountAmount,
//           total: session.amount_total || 0,

//           currency: session.currency || "usd",
//           status: "paid",
//           paymentStatus: session.payment_status,

//           // Shipping details
//           shippingAddress: session.shipping_details?.address
//             ? JSON.stringify(session.shipping_details.address)
//             : null,
//           shippingName: session.shipping_details?.name || null,

//           // Stripe reference
//           stripeSessionId: session.id,
//           stripePaymentIntentId: session.payment_intent as string,

//           // Discount code
//           discountCodeId: discountCodeId || null,

//           // Order items
//           items: {
//             create:
//               fullSession.line_items?.data.map((item) => ({
//                 productName: item.description || "Unknown Product",
//                 quantity: item.quantity || 1,
//                 price: item.price?.unit_amount || 0,
//                 total: item.amount_total,
//               })) || [],
//           },
//         },
//         include: {
//           items: true,
//         },
//       });

//       // Increment discount code usage count
//       if (discountCodeId) {
//         await prisma.discountCode.update({
//           where: { id: discountCodeId },
//           data: {
//             usageCount: {
//               increment: 1,
//             },
//           },
//         });
//       }

//       console.log("Order created:", order.id);

//       // TODO: Send confirmation email
//       // TODO: Update inventory
//       // TODO: Notify store owner
//     }

//     return NextResponse.json({ received: true });
//   } catch (error: any) {
//     console.error("Webhook error:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripeClient } from "~/lib/stripe/client";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    let event: Stripe.Event;

    try {
      event = stripeClient.webhooks.constructEvent(
        body,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      console.error(
        "Webhook signature verification failed:",
        err instanceof Error ? err.message : "Unknown error",
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Get business ID from metadata
      const businessId = session.metadata?.businessId;
      const discountCodeId = session.metadata?.discountCodeId;

      if (!businessId) {
        console.error("No businessId in session metadata");
        return NextResponse.json({ received: true });
      }

      // Retrieve full session with line items and product (for metadata: productId, productVariantId)
      const fullSession = await stripeClient.checkout.sessions.retrieve(
        session.id,
        {
          expand: ["line_items", "line_items.data.price.product", "total_details"],
        },
        {
          stripeAccount: session.metadata?.stripeAccountId,
        },
      );

      // Calculate discount amount from total_details
      const discountAmount = fullSession.total_details?.amount_discount || 0;

      // Create order in database
      const order = await db.order.create({
        data: {
          businessId,
          customerEmail:
            session.customer_email ??
            session.customer_details?.email ??
            "unknown@example.com",
          customerName:
            session.metadata?.customerName ??
            session.customer_details?.name ??
            "Unknown",

          // Amounts in cents
          subtotal: session.amount_subtotal ?? 0,
          tax: session.total_details?.amount_tax ?? 0,
          shipping: session.total_details?.amount_shipping ?? 0,
          discount: discountAmount,
          total: session.amount_total ?? 0,

          currency: session.currency ?? "usd",
          status: "paid",
          paymentStatus: session.payment_status,

          // Shipping details
          shippingAddress: session.shipping_details?.address
            ? JSON.stringify(session.shipping_details.address)
            : null,
          shippingName: session.shipping_details?.name || null,

          // Stripe reference
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent as string,

          // Discount code
          discountCodeId: discountCodeId || null,

          // Order items (with product/variant ids from product_data.metadata for inventory and refunds)
          items: {
            create:
              fullSession.line_items?.data.map((item) => {
                const product = item.price?.product;
                const metadata =
                  product &&
                  typeof product === "object" &&
                  !("deleted" in product && product.deleted) &&
                  "metadata" in product
                    ? (product as { metadata: Record<string, string> }).metadata
                    : {};
                const productId =
                  (metadata.productId as string)?.trim() || null;
                const productVariantId =
                  (metadata.productVariantId as string)?.trim() || null;
                const variantName =
                  (metadata.variantName as string)?.trim() || null;
                const sku = (metadata.sku as string)?.trim() || null;
                return {
                  productName: item.description ?? "Unknown Product",
                  variantName,
                  sku,
                  productId,
                  productVariantId,
                  quantity: item.quantity ?? 1,
                  price: item.price?.unit_amount ?? 0,
                  total: item.amount_total,
                };
              }) || [],
          },
        },
        include: {
          items: true,
        },
      });

      // Increment discount code usage count
      if (discountCodeId) {
        await db.discountCode.update({
          where: { id: discountCodeId },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        });
      }

      console.log("Order created:", order.id);

      // Deduct inventory (variant-level or product-level for no-variant items); prevent negative stock
      const orderItems = (
        order as unknown as {
          items: {
            productId: string | null;
            productVariantId: string | null;
            quantity: number;
          }[];
        }
      ).items;
      try {
        await db.$transaction(async (tx) => {
          for (const item of orderItems) {
            const qty = item.quantity;

            if (item.productVariantId) {
              const variant = await tx.productVariant.findUnique({
                where: { id: item.productVariantId },
                select: {
                  id: true,
                  inventoryQty: true,
                  productId: true,
                  product: {
                    select: { businessId: true },
                  },
                },
              });

              if (!variant) continue;

              const newQty = variant.inventoryQty - qty;
              if (newQty < 0) continue;

              await tx.productVariant.update({
                where: { id: item.productVariantId },
                data: { inventoryQty: newQty },
              });

              await tx.inventoryHistory.create({
                data: {
                  variantId: item.productVariantId,
                  productId: variant.productId,
                  businessId: variant.product.businessId,
                  previousQty: variant.inventoryQty,
                  newQty,
                  changeQty: -qty,
                  reason: "sale",
                  note: `Order #${order.id.slice(0, 8)}`,
                  orderId: order.id,
                },
              });
            } else if (item.productId) {
              const product = await tx.product.findUnique({
                where: { id: item.productId },
                select: {
                  id: true,
                  inventoryQty: true,
                  businessId: true,
                  trackInventory: true,
                },
              });

              if (!product || !product.trackInventory) continue;

              const newQty = product.inventoryQty - qty;
              if (newQty < 0) continue;

              await tx.product.update({
                where: { id: item.productId },
                data: { inventoryQty: newQty },
              });
            }
          }
        });

        console.log("Inventory deducted for order:", order.id);
      } catch (inventoryError) {
        console.error("Failed to deduct inventory:", inventoryError);
        // Don't fail the whole webhook if inventory update fails
      }

      // TODO: Send confirmation email
      // TODO: Notify store owner
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
