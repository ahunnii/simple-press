// app/api/webhooks/stripe/route.ts
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { Prisma } from "generated/prisma";
import * as Sentry from "@sentry/nextjs";

import type { PoolDeductionResult } from "~/lib/inventory";
import type { ReservationEntry } from "~/lib/inventory/reservation";
import { findOrCreateShippingAddress } from "~/lib/address-utils";
import { getBusinessUrl } from "~/lib/business-url";
import { createOrderFromCheckout } from "~/lib/checkout/create-order";
import { resolveCheckoutShipping } from "~/lib/checkout/shipping";
import {
  sendBackorderAlert,
  sendLowInventoryAlert,
  sendNewOrderNotification,
  sendOrderConfirmation,
  sendOutOfStockAlert,
  sendPoolLowInventoryAlert,
  sendPoolOutOfStockAlert,
} from "~/lib/email/templates";
import { deductPoolInventory } from "~/lib/inventory";
import { releaseReservation } from "~/lib/inventory/reservation";
import { stripeClient } from "~/lib/stripe/client";
import { normalizeEmail } from "~/lib/utils";
import { db } from "~/server/db";

type NotificationCandidate = {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  newQty: number;
  previousQty: number;
  allowBackorders: boolean;
  lowInventoryThreshold: number | null;
};

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
      Sentry.captureException(err, {
        tags: { "webhook.step": "signature-verification" },
      });
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
          Sentry.captureMessage(
            `[Webhook] Missing businessId in checkout session metadata: ${session.id}`,
            { level: "warning", tags: { "webhook.step": "metadata-check" } },
          );
          return NextResponse.json({ received: true });
        }

        // Idempotency guard — Stripe may retry the same event
        const existingOrder = await db.order.findUnique({
          where: { stripeSessionId: session.id },
          select: { id: true },
        });
        if (existingOrder) {
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
            domainStatus: true,
            name: true,
            ownerEmail: true,
            pickupLocation: true,
            pickupInstructions: true,
            businessAddress: true,
            siteContent: {
              select: {
                logoUrl: true,
              },
            },
          },
        });

        if (!business?.stripeAccountId) {
          Sentry.captureMessage(
            `[Webhook] Business ${businessId} not found or missing Stripe account`,
            {
              level: "error",
              tags: {
                "webhook.step": "business-lookup",
                businessId,
              },
            },
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
              "payment_intent",
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
        const customerEmail = normalizeEmail(
          session.customer_email ??
            session.customer_details?.email ??
            "unknown@example.com",
        );

        if (customerEmail === "unknown@example.com") {
          Sentry.withScope((scope) => {
            scope.setTag("webhook.step", "customer-email-missing");
            scope.setTag("businessId", businessId);
            scope.setExtra("stripeSessionId", session.id);
            Sentry.captureMessage(
              "Stripe checkout session completed with no customer email — order created without customer record or confirmation email",
              "warning",
            );
          });
        }

        if (customerEmail !== "unknown@example.com") {
          // Parse customer name from Stripe (use 'name' field, not 'individual_name')
          const customerName = fullSession.customer_details?.name?.trim() ?? "";
          const nameParts = customerName.split(" ").filter((p) => p.length > 0);
          const firstName = nameParts[0] ?? "Guest";
          const lastName = nameParts.slice(1).join(" ") || "";

          // Check if there's a user with this email in the business
          const existingUser = await db.user.findFirst({
            where: {
              email: customerEmail,
              emailVerified: true,
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
              // firstName, lastName, phone intentionally not updated on repeat orders.
              // A customer may purchase on behalf of someone else and provide the
              // recipient's name/phone at Stripe checkout while using their own email.
              // Overwriting those fields would corrupt the primary customer record.
              // Only the userId link is kept current.
              userId: existingUser?.id ?? undefined,
            },
          });
        }

        // Create or reuse shipping address if provided (see resolveCheckoutShipping)
        let shippingAddressId: string | null = null;

        const resolved = resolveCheckoutShipping(fullSession);

        if (resolved.addressLine1 && customer) {
          const customerName = resolved.nameForAddress ?? "";
          const nameParts = customerName.split(" ").filter((p) => p.length > 0);
          const firstName = nameParts[0] ?? "Guest";
          const lastName = nameParts.slice(1).join(" ") || "";

          shippingAddressId = await findOrCreateShippingAddress({
            customerId: customer.id,
            firstName,
            lastName,
            address1: resolved.addressLine1,
            address2: resolved.addressLine2,
            city: resolved.city,
            province: resolved.province,
            zip: resolved.zip,
            country: resolved.country,
            phone: resolved.phone,
          });
        }

        const rawMetaDiscountId =
          typeof discountCodeId === "string" ? discountCodeId.trim() : "";
        let verifiedDiscountCodeId: string | null = null;
        if (rawMetaDiscountId.length > 0) {
          const dc = await db.discountCode.findFirst({
            where: {
              id: rawMetaDiscountId,
              businessId: business.id,
            },
            select: { id: true },
          });
          verifiedDiscountCodeId = dc?.id ?? null;
        }

        const deliveryMethod =
          session.metadata?.deliveryMethod === "pickup" ? "pickup" : "ship";

        const order = await createOrderFromCheckout(db, {
          business,
          customer,
          shippingAddressId,
          customerEmail,
          session,
          fullSession,
          verifiedDiscountCodeId,
          discountAmount,
          deliveryMethod,
        });

        // orderNumber is used by the inventory-deduction block below for log
        // notes and InventoryHistory records.
        const orderNumber = order.orderNumber;

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
          } catch (customerError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "customer-metrics");
              scope.setTag("businessId", businessId);
              Sentry.captureException(customerError);
            });
          }
        }

        // Increment discount code usage.
        // Use updateMany with a WHERE guard so two concurrent webhooks racing
        // on the last available slot can't both increment past usageLimit.
        // The conditional UPDATE is evaluated atomically by the DB.
        if (verifiedDiscountCodeId) {
          try {
            const dc = await db.discountCode.findUnique({
              where: { id: verifiedDiscountCodeId },
              select: { usageLimit: true },
            });
            await db.discountCode.updateMany({
              where: {
                id: verifiedDiscountCodeId,
                ...(dc?.usageLimit != null
                  ? { usageCount: { lt: dc.usageLimit } }
                  : {}),
              },
              data: {
                usageCount: { increment: 1 },
              },
            });
          } catch (discountError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "discount-increment");
              scope.setTag("businessId", businessId);
              Sentry.captureException(discountError);
            });
          }
        }

        // Deduct inventory
        const notificationCandidates: NotificationCandidate[] = [];
        const poolNotificationCandidates: PoolDeductionResult[] = [];

        try {
          await db.$transaction(async (tx) => {
            // Group pool-based items by poolId for aggregate deduction
            const poolGroups = new Map<
              string,
              {
                items: { productId: string; quantity: number }[];
                unitsConsumedMap: Record<string, number>;
              }
            >();

            for (const item of order.items) {
              const qty = item.quantity;

              // Handle variant inventory
              if (item.productVariantId) {
                const variant = await tx.productVariant.findUnique({
                  where: { id: item.productVariantId },
                  select: {
                    id: true,
                    name: true,
                    inventoryQty: true,
                    productId: true,
                    product: {
                      select: {
                        businessId: true,
                        trackInventory: true,
                        allowBackorders: true,
                        name: true,
                        lowInventoryThreshold: true,
                      },
                    },
                  },
                });

                if (!variant) {
                  Sentry.captureMessage(
                    `[Webhook] Variant ${item.productVariantId} not found — may have been deleted after checkout`,
                    {
                      level: "warning",
                      tags: {
                        "webhook.step": "inventory-variant-not-found",
                        businessId,
                      },
                    },
                  );
                  continue;
                }

                if (!variant.product.trackInventory) {
                  continue;
                }

                const previousQty = variant.inventoryQty;

                if (variant.product.allowBackorders) {
                  await tx.productVariant.update({
                    where: { id: variant.id },
                    data: { inventoryQty: { decrement: qty } },
                  });
                  const newQty = previousQty - qty;
                  await tx.inventoryHistory.create({
                    data: {
                      variantId: variant.id,
                      productId: variant.productId,
                      businessId: variant.product.businessId,
                      previousQty,
                      newQty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Order #${orderNumber}`,
                      orderId: order.id,
                    },
                  });
                  notificationCandidates.push({
                    productId: variant.productId,
                    productName: variant.product.name,
                    variantId: variant.id,
                    variantName: variant.name,
                    newQty,
                    previousQty,
                    allowBackorders: variant.product.allowBackorders,
                    lowInventoryThreshold:
                      variant.product.lowInventoryThreshold,
                  });
                } else {
                  const result = await tx.productVariant.updateMany({
                    where: {
                      id: variant.id,
                      inventoryQty: { gte: qty },
                    },
                    data: { inventoryQty: { decrement: qty } },
                  });

                  if (result.count === 0) {
                    Sentry.captureMessage(
                      `[Webhook] Oversell for variant ${variant.id} on order ${orderNumber}`,
                      {
                        level: "warning",
                        tags: {
                          "webhook.step": "inventory-oversell",
                          businessId,
                        },
                      },
                    );
                    await tx.inventoryHistory.create({
                      data: {
                        variantId: variant.id,
                        productId: variant.productId,
                        businessId: variant.product.businessId,
                        previousQty,
                        newQty: previousQty,
                        changeQty: 0,
                        reason: "oversell",
                        note: `Order #${orderNumber}: insufficient stock at fulfillment; inventory unchanged`,
                        orderId: order.id,
                      },
                    });
                    continue;
                  }

                  const newQty = previousQty - qty;
                  await tx.inventoryHistory.create({
                    data: {
                      variantId: variant.id,
                      productId: variant.productId,
                      businessId: variant.product.businessId,
                      previousQty,
                      newQty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Order #${orderNumber}`,
                      orderId: order.id,
                    },
                  });
                  notificationCandidates.push({
                    productId: variant.productId,
                    productName: variant.product.name,
                    variantId: variant.id,
                    variantName: variant.name,
                    newQty,
                    previousQty,
                    allowBackorders: variant.product.allowBackorders,
                    lowInventoryThreshold:
                      variant.product.lowInventoryThreshold,
                  });
                }
              }
              // Handle product inventory (no variant)
              else if (item.productId) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  select: {
                    id: true,
                    name: true,
                    inventoryQty: true,
                    businessId: true,
                    trackInventory: true,
                    allowBackorders: true,
                    lowInventoryThreshold: true,
                    baseInventoryUnitId: true,
                    baseUnitsConsumed: true,
                  },
                });

                if (!product) {
                  Sentry.captureMessage(
                    `[Webhook] Product ${item.productId} not found — may have been deleted after checkout`,
                    {
                      level: "warning",
                      tags: {
                        "webhook.step": "inventory-product-not-found",
                        businessId,
                      },
                    },
                  );
                  continue;
                }

                // Pool-based product — accumulate for aggregate deduction
                if (product.baseInventoryUnitId) {
                  const poolId = product.baseInventoryUnitId;
                  if (!poolGroups.has(poolId)) {
                    poolGroups.set(poolId, { items: [], unitsConsumedMap: {} });
                  }
                  const group = poolGroups.get(poolId)!;
                  group.items.push({ productId: product.id, quantity: qty });
                  group.unitsConsumedMap[product.id] =
                    product.baseUnitsConsumed ?? 1;
                  continue;
                }

                // Only deduct if tracking inventory
                if (!product.trackInventory) {
                  continue;
                }

                const previousQty = product.inventoryQty;

                if (product.allowBackorders) {
                  await tx.product.update({
                    where: { id: product.id },
                    data: { inventoryQty: { decrement: qty } },
                  });
                  const newQty = previousQty - qty;
                  await tx.inventoryHistory.create({
                    data: {
                      productId: product.id,
                      businessId: product.businessId,
                      previousQty,
                      newQty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Order #${orderNumber}`,
                      orderId: order.id,
                      variantId: null,
                    },
                  });
                  notificationCandidates.push({
                    productId: product.id,
                    productName: product.name,
                    newQty,
                    previousQty,
                    allowBackorders: product.allowBackorders,
                    lowInventoryThreshold: product.lowInventoryThreshold,
                  });
                } else {
                  const result = await tx.product.updateMany({
                    where: {
                      id: product.id,
                      inventoryQty: { gte: qty },
                    },
                    data: { inventoryQty: { decrement: qty } },
                  });

                  if (result.count === 0) {
                    Sentry.captureMessage(
                      `[Webhook] Oversell for product ${product.id} on order ${orderNumber}`,
                      {
                        level: "warning",
                        tags: {
                          "webhook.step": "inventory-oversell",
                          businessId,
                        },
                      },
                    );
                    await tx.inventoryHistory.create({
                      data: {
                        productId: product.id,
                        businessId: product.businessId,
                        previousQty,
                        newQty: previousQty,
                        changeQty: 0,
                        reason: "oversell",
                        note: `Order #${orderNumber}: insufficient stock at fulfillment; inventory unchanged`,
                        orderId: order.id,
                        variantId: null,
                      },
                    });
                    continue;
                  }

                  const newQty = previousQty - qty;
                  await tx.inventoryHistory.create({
                    data: {
                      productId: product.id,
                      businessId: product.businessId,
                      previousQty,
                      newQty,
                      changeQty: -qty,
                      reason: "sale",
                      note: `Order #${orderNumber}`,
                      orderId: order.id,
                      variantId: null,
                    },
                  });
                  notificationCandidates.push({
                    productId: product.id,
                    productName: product.name,
                    newQty,
                    previousQty,
                    allowBackorders: product.allowBackorders,
                    lowInventoryThreshold: product.lowInventoryThreshold,
                  });
                }
              }
            }

            // Deduct pool inventory (aggregate per pool)
            for (const [poolId, group] of poolGroups) {
              const result = await deductPoolInventory(tx, {
                poolId,
                items: group.items,
                unitsConsumedMap: group.unitsConsumedMap,
                orderId: order.id,
                orderNumber,
                businessId,
              });
              if (result) poolNotificationCandidates.push(result);
            }

            // Release the inventory reservation now that physical inventory has
            // been deducted. Look up by stripeSessionId first, fall back to
            // metadata.reservationId. Guard so a missing/already-consumed
            // reservation never breaks order creation.
            try {
              const reservationId = session.metadata?.reservationId;
              const reservation = await tx.inventoryReservation.findFirst({
                where: {
                  OR: [
                    { stripeSessionId: session.id },
                    ...(reservationId ? [{ id: reservationId }] : []),
                  ],
                  status: "active",
                },
              });
              if (reservation) {
                const entries = reservation.items as ReservationEntry[];
                await releaseReservation(tx, { items: entries });
                await tx.inventoryReservation.update({
                  where: { id: reservation.id },
                  data: { status: "consumed" },
                });
              }
            } catch (reservationErr) {
              Sentry.withScope((scope) => {
                scope.setTag("webhook.step", "reservation-release-completed");
                scope.setTag("businessId", businessId);
                Sentry.captureException(reservationErr);
              });
              // Non-fatal — inventory deduction and order creation still succeed
            }
          });
        } catch (inventoryError) {
          Sentry.withScope((scope) => {
            scope.setTag("webhook.step", "inventory-deduction");
            scope.setTag("businessId", businessId);
            Sentry.captureException(inventoryError);
          });
          // Don't fail webhook - order is still created
        }

        // Send inventory alert notifications
        if (notificationCandidates.length > 0) {
          try {
            const businessUrl = getBusinessUrl(business);
            const alertedProductIds = new Set<string>();
            for (const candidate of notificationCandidates) {
              const {
                productId,
                productName,
                variantName,
                newQty,
                previousQty,
                allowBackorders,
                lowInventoryThreshold,
              } = candidate;

              // One alert per product per order — skip subsequent variants of the same product
              if (alertedProductIds.has(productId)) continue;

              const adminProductUrl = `${businessUrl}/admin/products/${productId}`;

              if (newQty <= 0) {
                // Atomic flag set — count > 0 means we won the race and should send the email
                const flagged = await db.product.updateMany({
                  where: { id: productId, outOfStockAlertSent: false },
                  data: {
                    outOfStockAlertSent: true,
                    lowInventoryAlertSent: true,
                  },
                });
                if (flagged.count > 0) {
                  alertedProductIds.add(productId);
                  if (allowBackorders) {
                    await sendBackorderAlert({
                      productName,
                      variantName,
                      adminProductUrl,
                      business,
                    });
                  } else {
                    await sendOutOfStockAlert({
                      productName,
                      variantName,
                      adminProductUrl,
                      business,
                    });
                  }
                }
              } else if (
                lowInventoryThreshold !== null &&
                newQty <= lowInventoryThreshold &&
                previousQty > lowInventoryThreshold
              ) {
                const flagged = await db.product.updateMany({
                  where: { id: productId, lowInventoryAlertSent: false },
                  data: { lowInventoryAlertSent: true },
                });
                if (flagged.count > 0) {
                  alertedProductIds.add(productId);
                  await sendLowInventoryAlert({
                    productName,
                    variantName,
                    currentQty: newQty,
                    threshold: lowInventoryThreshold,
                    adminProductUrl,
                    business,
                  });
                }
              }
            }
          } catch (notifyError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "inventory-notification");
              scope.setTag("businessId", businessId);
              Sentry.captureException(notifyError);
            });
          }
        }

        // Send pool inventory alert notifications
        if (poolNotificationCandidates.length > 0) {
          try {
            const businessUrl = getBusinessUrl(business);
            const alertedPoolIds = new Set<string>();
            for (const candidate of poolNotificationCandidates) {
              if (candidate.wasOversell) continue;
              if (alertedPoolIds.has(candidate.poolId)) continue;

              const adminInventoryUrl = `${businessUrl}/admin/inventory`;

              if (candidate.newQty <= 0) {
                const flagged = await db.baseInventoryUnit.updateMany({
                  where: { id: candidate.poolId, outOfStockAlertSent: false },
                  data: {
                    outOfStockAlertSent: true,
                    lowInventoryAlertSent: true,
                  },
                });
                if (flagged.count > 0) {
                  alertedPoolIds.add(candidate.poolId);
                  await sendPoolOutOfStockAlert({
                    poolName: candidate.poolName,
                    adminUrl: adminInventoryUrl,
                    business,
                  });
                }
              } else if (
                candidate.lowInventoryThreshold !== null &&
                candidate.newQty <= candidate.lowInventoryThreshold &&
                candidate.previousQty > candidate.lowInventoryThreshold
              ) {
                const flagged = await db.baseInventoryUnit.updateMany({
                  where: { id: candidate.poolId, lowInventoryAlertSent: false },
                  data: { lowInventoryAlertSent: true },
                });
                if (flagged.count > 0) {
                  alertedPoolIds.add(candidate.poolId);
                  await sendPoolLowInventoryAlert({
                    poolName: candidate.poolName,
                    currentQty: candidate.newQty,
                    threshold: candidate.lowInventoryThreshold,
                    adminUrl: adminInventoryUrl,
                    business,
                  });
                }
              }
            }
          } catch (poolNotifyError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "pool-inventory-notification");
              scope.setTag("businessId", businessId);
              Sentry.captureException(poolNotifyError);
            });
          }
        }

        // Send order confirmation email (skip if customer email is unknown)
        if (customerEmail === "unknown@example.com") {
        } else
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
              deliveryMethod: order.deliveryMethod as "ship" | "pickup",
              ...(order.deliveryMethod === "pickup"
                ? {
                    pickupLocation:
                      business.pickupLocation ??
                      business.businessAddress ??
                      undefined,
                    pickupInstructions:
                      business.pickupInstructions ?? undefined,
                  }
                : {}),
              business: {
                name: business.name,
                ownerEmail: business.ownerEmail,
                siteContent: business.siteContent,
                subdomain: business.subdomain,
                customDomain: business.customDomain,
                domainStatus: business.domainStatus,
              },
              idempotencyKey: `order-confirmation-${session.id}`,
            });
          } catch (emailError) {
            Sentry.withScope((scope) => {
              scope.setTag("webhook.step", "order-confirmation-email");
              scope.setTag("businessId", businessId);
              Sentry.captureException(emailError);
            });
            // Don't fail the webhook if email fails
          }

        try {
          await sendNewOrderNotification({
            to: business.ownerEmail,
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName ?? "Guest",
            customerEmail: order.customerEmail,
            items: order.items.map((item) => ({
              productName: item.productName,
              variantName: item.variantName,
              quantity: item.quantity,
              total: Math.round(item.total),
            })),
            subtotal: order.subtotal,
            shipping: order.shipping,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
            deliveryMethod: order.deliveryMethod as "ship" | "pickup",
            business: {
              name: business.name,
              siteContent: business.siteContent,
              subdomain: business.subdomain,
              customDomain: business.customDomain,
              domainStatus: business.domainStatus,
            },
            idempotencyKey: `owner-notification-${session.id}`,
          });
        } catch (ownerEmailError) {
          Sentry.withScope((scope) => {
            scope.setTag("webhook.step", "owner-notification-email");
            scope.setTag("businessId", businessId);
            Sentry.captureException(ownerEmailError);
          });
        }

        return NextResponse.json({ received: true });
      } catch (orderError: unknown) {
        // Two simultaneous deliveries of the same event can race past the idempotency
        // check and both attempt db.order.create. The second will hit the unique
        // constraint on stripeSessionId — return 200 so Stripe doesn't retry.
        if (
          orderError instanceof Prisma.PrismaClientKnownRequestError &&
          orderError.code === "P2002" &&
          (orderError.meta?.target as string[] | undefined)?.some(
            (f) => f === "stripeSessionId" || f === "Order_stripeSessionId_key",
          )
        ) {
          return NextResponse.json({ received: true });
        }

        Sentry.withScope((scope) => {
          scope.setTag("webhook.step", "order-processing");
          scope.setTag("eventType", event.type);
          Sentry.captureException(orderError);
        });
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

    // Handle checkout.session.expired — release the inventory reservation so
    // held stock is returned to available. Idempotent: no-op if already released.
    if (event.type === "checkout.session.expired") {
      const expiredSession = event.data.object;
      try {
        const reservationId = expiredSession.metadata?.reservationId;
        const reservation = await db.inventoryReservation.findFirst({
          where: {
            OR: [
              { stripeSessionId: expiredSession.id },
              ...(reservationId ? [{ id: reservationId }] : []),
            ],
            status: "active",
          },
        });
        if (reservation) {
          await db.$transaction(async (tx) => {
            const entries = reservation.items as ReservationEntry[];
            await releaseReservation(tx, { items: entries });
            await tx.inventoryReservation.update({
              where: { id: reservation.id },
              data: { status: "released" },
            });
          });
        }
      } catch (expiredErr) {
        Sentry.captureException(expiredErr, {
          tags: { "webhook.step": "reservation-release-expired" },
        });
      }
      return NextResponse.json({ received: true });
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
        Sentry.captureException(error, {
          tags: { "webhook.step": "account-updated" },
        });
      }

      return NextResponse.json({ received: true });
    }

    // Handle account.application.deauthorized (user disconnects)
    if (event.type === "account.application.deauthorized") {
      const account = event.data.object;

      try {
        await db.business.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeAccountId: null },
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { "webhook.step": "account-deauthorized" },
        });
      }

      return NextResponse.json({ received: true });
    }

    // Unknown event type
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    Sentry.captureException(error, {
      tags: { "webhook.step": "handler" },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
