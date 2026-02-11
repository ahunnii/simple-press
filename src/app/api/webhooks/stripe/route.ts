// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { findOrCreateShippingAddress } from "~/lib/address-utils";
import { sendOrderConfirmation } from "~/lib/email/templates";
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
        "[Webhook] Signature verification failed:",
        err instanceof Error ? err.message : "Unknown error",
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      try {
        // Get business ID from metadata
        const businessId = session.metadata?.businessId;
        const discountCodeId = session.metadata?.discountCodeId;

        if (!businessId) {
          console.error("[Webhook] No businessId in session metadata");
          return NextResponse.json({ received: true });
        }

        // 🔑 Get business with Stripe account
        const business = await db.business.findUnique({
          where: { id: businessId },
          select: {
            id: true,
            stripeAccountId: true,
            subdomain: true,
            customDomain: true,
            name: true,
            ownerEmail: true,
            siteContent: {
              select: {
                logoUrl: true,
              },
            },
          },
        });

        if (!business?.stripeAccountId) {
          console.error(
            `[Webhook] Business ${businessId} not found or no Stripe account`,
          );
          return NextResponse.json({ received: true });
        }

        const stripeAccountId = event.account;

        if (!stripeAccountId) {
          throw new Error("Missing Stripe connected account on event");
        }

        // 🔑 Retrieve full session using business's Stripe account
        const fullSession = await stripeClient.checkout.sessions.retrieve(
          session.id,
          {
            expand: [
              "line_items",
              "line_items.data.price.product",
              "total_details",
            ],
          },
          {
            stripeAccount: stripeAccountId,
          },
        );

        // Calculate discount amount
        const discountAmount = fullSession.total_details?.amount_discount ?? 0;

        // Get or create customer
        let customer = null;
        const customerEmail =
          session.customer_email ??
          session.customer_details?.email ??
          "unknown@example.com";

        if (customerEmail !== "unknown@example.com") {
          console.log(
            "[Webhook] customer_details:",
            JSON.stringify(fullSession.customer_details, null, 2),
          );

          // Parse customer name from Stripe (use 'name' field, not 'individual_name')
          const customerName = fullSession.customer_details?.name?.trim() ?? "";
          const nameParts = customerName.split(" ").filter((p) => p.length > 0);
          const firstName = nameParts[0] ?? "Guest";
          const lastName = nameParts.slice(1).join(" ") || "";

          // Check if there's a user with this email in the business
          const existingUser = await db.user.findFirst({
            where: {
              email: customerEmail,
              businessId: business.id,
            },
            select: { id: true },
          });

          customer = await db.customer.upsert({
            where: {
              businessId_email: {
                email: customerEmail,
                businessId: business.id,
              },
            },
            create: {
              email: customerEmail,
              firstName,
              lastName,
              phone: fullSession.customer_details?.phone ?? null,
              businessId: business.id,
              userId: existingUser?.id ?? null, // Link to user if exists
            },
            update: {
              // firstName,
              // lastName,
              phone: fullSession.customer_details?.phone ?? null,
              // Link to user if not already linked and user exists
              userId: existingUser?.id ?? undefined,
            },
          });

          console.log(
            `[Webhook] Customer upserted: ${customer.id} (${customer.email})${existingUser ? " - linked to user" : ""}`,
          );
        }

        if (!customer) {
          console.error(
            "[Webhook] Failed to create/find customer - will create order without customer link",
          );
        }

        // Create or reuse shipping address if provided
        let shippingAddressId: string | null = null;

        const shippingDetails = fullSession.customer_details?.address;

        if (shippingDetails && customer) {
          const customerName = fullSession.customer_details?.name ?? "";
          const nameParts = customerName.split(" ");
          const firstName = nameParts[0] ?? "Guest";
          const lastName = nameParts.slice(1).join(" ") || "";

          shippingAddressId = await findOrCreateShippingAddress({
            customerId: customer.id,
            firstName,
            lastName,
            address1: shippingDetails.line1 ?? "",
            address2: shippingDetails.line2 ?? null,
            city: shippingDetails.city ?? "",
            province: shippingDetails.state ?? "",
            zip: shippingDetails.postal_code ?? "",
            country: shippingDetails.country ?? "",
            phone: fullSession.customer_details?.phone ?? null,
          });
        } else if (shippingDetails && !customer) {
          console.warn(
            "[Webhook] Shipping details provided but no customer - cannot create address",
          );
        }

        // Generate order number
        const lastOrder = await db.order.findFirst({
          where: { businessId: business.id },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true },
        });
        const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

        const existing = await db.order.findUnique({
          where: { stripeSessionId: session.id },
        });

        if (existing) {
          return NextResponse.json({ received: true });
        }

        // TODO: Fix how we handle discount codes. DO NOT ADD THEM if they don't exist
        // const discountCode = appliedDiscount?.code
        //   ? await ctx.discountCode.findUnique({
        //       where: { code: appliedDiscount.code },
        //     })
        //   : null;

        // Create order
        const order = await db.order.create({
          data: {
            businessId: business.id,
            orderNumber,
            customerId: customer?.id ?? null,
            shippingAddressId,

            customerEmail,
            customerName: session.customer_details?.name ?? "Unknown",

            // Amounts in cents
            subtotal: session.amount_subtotal ?? 0,
            tax: fullSession.total_details?.amount_tax ?? 0,
            shipping: fullSession.total_details?.amount_shipping ?? 0,
            discount: discountAmount,
            total: session.amount_total ?? 0,

            // currency: session.currency ?? "usd",
            status: "paid",
            paymentStatus: session.payment_status ?? "paid",
            fulfillmentStatus: "unfulfilled",

            // Stripe reference
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,

            // Discount code
            // discountCodeId: discountCodeId ?? null,

            // discountCode: !!discountCodeId
            //   ? { connect: { id: discountCodeId } }
            //   : undefined,

            // Order items
            items: {
              create:
                fullSession.line_items?.data.map((item) => {
                  const product = item.price?.product;
                  const metadata =
                    product &&
                    typeof product === "object" &&
                    !("deleted" in product && product.deleted) &&
                    "metadata" in product
                      ? (product as { metadata: Record<string, string> })
                          .metadata
                      : {};

                  const productId = metadata.productId?.trim() ?? null;
                  const productVariantId =
                    metadata.productVariantId?.trim() ?? null;
                  const variantName = metadata.variantName?.trim() ?? null;
                  const sku = metadata.sku?.trim() ?? null;

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
                }) ?? [],
            },
          },
          include: {
            items: true,
          },
        });

        console.log(
          `[Webhook] Order created: ${order.id} for business ${business.id}`,
        );

        // Update customer metrics
        if (customer) {
          try {
            await db.customer.update({
              where: { id: customer.id },
              data: {
                totalSpent: { increment: order.total },
                orderCount: { increment: 1 },
              },
            });
            console.log(
              `[Webhook] Updated customer metrics for ${customer.email}`,
            );
          } catch (customerError) {
            console.error(
              "[Webhook] Failed to update customer metrics:",
              customerError,
            );
          }
        }

        // Increment discount code usage
        if (discountCodeId) {
          try {
            await db.discountCode.update({
              where: { id: discountCodeId },
              data: {
                usageCount: { increment: 1 },
              },
            });
          } catch (discountError) {
            console.error(
              "[Webhook] Failed to update discount code:",
              discountError,
            );
          }
        }

        // Deduct inventory
        try {
          await db.$transaction(async (tx) => {
            for (const item of order.items) {
              const qty = item.quantity;

              // Handle variant inventory
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

                if (!variant) {
                  console.warn(
                    `[Webhook] Variant ${item.productVariantId} not found`,
                  );
                  continue;
                }

                const newQty = variant.inventoryQty - qty;

                // Prevent negative inventory
                if (newQty < 0) {
                  console.warn(
                    `[Webhook] Insufficient inventory for variant ${variant.id}`,
                  );
                  continue;
                }

                // Update inventory
                await tx.productVariant.update({
                  where: { id: variant.id },
                  data: { inventoryQty: newQty },
                });

                // Create history record
                await tx.inventoryHistory.create({
                  data: {
                    variantId: variant.id,
                    productId: variant.productId,
                    businessId: variant.product.businessId,
                    previousQty: variant.inventoryQty,
                    newQty,
                    changeQty: -qty,
                    reason: "sale",
                    note: `Order #${orderNumber}`,
                    orderId: order.id,
                  },
                });
              }
              // Handle product inventory (no variant)
              else if (item.productId) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  select: {
                    id: true,
                    inventoryQty: true,
                    businessId: true,
                    trackInventory: true,
                    allowBackorders: true,
                  },
                });

                if (!product) {
                  console.warn(`[Webhook] Product ${item.productId} not found`);
                  continue;
                }

                // Only deduct if tracking inventory
                if (!product.trackInventory) {
                  continue;
                }

                const newQty = product.inventoryQty - qty;

                // Prevent negative inventory unless backorders are allowed
                if (newQty < 0 && !product.allowBackorders) {
                  console.warn(
                    `[Webhook] Insufficient inventory for product ${product.id}`,
                  );
                  continue;
                }

                // Update inventory
                await tx.product.update({
                  where: { id: product.id },
                  data: { inventoryQty: newQty },
                });

                // Create history record
                await tx.inventoryHistory.create({
                  data: {
                    productId: product.id,
                    businessId: product.businessId,
                    previousQty: product.inventoryQty,
                    newQty,
                    changeQty: -qty,
                    reason: "sale",
                    note: `Order #${orderNumber}`,
                    orderId: order.id,
                    variantId: null,
                  },
                });
              }
            }
          });

          console.log(`[Webhook] Inventory deducted for order ${order.id}`);
        } catch (inventoryError) {
          console.error(
            "[Webhook] Failed to deduct inventory:",
            inventoryError,
          );
          // Don't fail webhook - order is still created
        }

        // Send order confirmation email
        try {
          // Fetch shipping address for email if available
          let shippingAddressForEmail = undefined;
          if (shippingAddressId) {
            const addr = await db.shippingAddress.findUnique({
              where: { id: shippingAddressId },
            });
            if (addr) {
              shippingAddressForEmail = {
                name: `${addr.firstName} ${addr.lastName}`.trim(),
                line1: addr.address1,
                line2: addr.address2 ?? null,
                city: addr.city,
                state: addr.province ?? "",
                postalCode: addr.zip,
                country: addr.country,
              };
            }
          }

          await sendOrderConfirmation({
            to: order.customerEmail,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            items: order.items.map((item) => ({
              productName: item.productName,
              variantName: item.variantName,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
            })),
            subtotal: order.subtotal,
            shipping: order.shipping,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
            shippingAddress: shippingAddressForEmail,
            business: {
              name: business.name,
              ownerEmail: business.ownerEmail,
              siteContent: business.siteContent,
              subdomain: business.subdomain,
              customDomain: business.customDomain,
            },
          });

          console.log(
            `[Webhook] Order confirmation email sent to ${order.customerEmail}`,
          );
        } catch (emailError) {
          console.error(
            "[Webhook] Failed to send order confirmation email:",
            emailError,
          );
          // Don't fail the webhook if email fails
        }

        // TODO: Notify store owner

        return NextResponse.json({ received: true });
      } catch (orderError: unknown) {
        console.error("[Webhook] Error processing order:", orderError);
        return NextResponse.json(
          {
            error:
              orderError instanceof Error
                ? orderError.message
                : "Unknown error",
          },
          { status: 500 },
        );
      }
    }

    // Handle account.updated (Connect account status changes)
    if (event.type === "account.updated") {
      const account = event.data.object;

      try {
        const business = await db.business.findUnique({
          where: { stripeAccountId: account.id },
          select: { id: true, subdomain: true },
        });

        if (business) {
          console.log(
            `[Webhook] Account updated for business ${business.id}: charges_enabled=${account.charges_enabled}, payouts_enabled=${account.payouts_enabled}`,
          );

          // Optional: Store account status in database
          // await db.business.update({
          //   where: { id: business.id },
          //   data: {
          //     stripeChargesEnabled: account.charges_enabled,
          //     stripePayoutsEnabled: account.payouts_enabled,
          //   },
          // });
        }
      } catch (error) {
        console.error("[Webhook] Error processing account.updated:", error);
      }

      return NextResponse.json({ received: true });
    }

    // Handle account.application.deauthorized (user disconnects)
    if (event.type === "account.application.deauthorized") {
      const account = event.data.object;

      try {
        const result = await db.business.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeAccountId: null },
        });

        console.log(
          `[Webhook] Account ${account.id} deauthorized (${result.count} businesses updated)`,
        );
      } catch (error) {
        console.error("[Webhook] Error processing deauthorization:", error);
      }

      return NextResponse.json({ received: true });
    }

    // Unknown event type
    console.log(`[Webhook] Unhandled event type: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
