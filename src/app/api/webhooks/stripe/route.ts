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
import { splitCustomerName } from "~/lib/customer-name";
import {
  sendAbandonedCheckoutEmail,
  sendBackorderAlert,
  sendDisputeAlert,
  sendLowInventoryAlert,
  sendNewOrderNotification,
  sendOrderConfirmation,
  sendOrderRefunded,
  sendOutOfStockAlert,
  sendPaymentsDisabledAlert,
  sendPoolLowInventoryAlert,
  sendPoolOutOfStockAlert,
} from "~/lib/email/templates";
import { deductPoolInventory } from "~/lib/inventory";
import { releaseReservation } from "~/lib/inventory/reservation";
import { PLATFORM_TERMS_VERSION } from "~/lib/legal/policy-versions";
import { stripeClient } from "~/lib/stripe/client";
import {
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleInvoiceVoided,
  handleSubscriptionCheckoutCompleted,
  handleSubscriptionCheckoutExpired,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "~/lib/subscriptions/webhook";
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

      // Subscription sessions are a parallel lane, not a branch inside this one:
      // they create no order here (`invoice.paid` does, once per paid invoice) and
      // hold no inventory reservation, and the one-time idempotency guard keyed on
      // `stripeSessionId` must never see them.
      if (session.mode === "subscription")
        return handleSubscriptionCheckoutCompleted(event);

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

        // 🔑 Bind the order to the account that actually processed the payment.
        // metadata.businessId is attacker-controllable by any connected merchant
        // (they can set arbitrary metadata on their own checkout sessions), so a
        // merchant could otherwise inject orders / decrement inventory in another
        // tenant's store. Reject when the metadata business isn't the one that
        // owns the connected account this event came from.
        if (business.stripeAccountId !== stripeAccountId) {
          Sentry.captureMessage(
            `[Webhook] businessId/account mismatch: metadata business ${businessId} does not own connected account ${stripeAccountId}`,
            {
              level: "error",
              tags: {
                "webhook.step": "account-mismatch",
                businessId,
              },
            },
          );
          return NextResponse.json({ received: true });
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
          // BOTH names land as NULL rather than "" or a placeholder when Stripe
          // sent nothing — `lastName` for a mononym ("Cher"), `firstName` for a
          // checkout that carried no name at all. See splitCustomerName: the
          // admin customer list sorts names `nulls: "last"`, so a real null
          // sinks a nameless customer to the end of the list, while the old
          // "Guest" fallback sorted as an ordinary G-name and — worse — read as
          // if the shopper were actually called Guest. The admin table already
          // falls back to the email address for display.
          //
          // The shipping-address block below deliberately does NOT use this
          // helper: those columns are non-nullable and get printed on a label,
          // so "" is the correct empty there.
          const parsedName = splitCustomerName(
            fullSession.customer_details?.name,
          );
          const firstName = parsedName.firstName;
          const lastName = parsedName.lastName;

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

        // Merchant-terms acceptance is agreed at checkout (see the Order
        // model docblock) — `merchantTermsUpdatedAt` snapshots the
        // terms-of-service Page's `updatedAt` so we can later tell which
        // wording was actually in force. Isolated in its own try/catch, same
        // convention as the other non-critical steps in this handler (e.g.
        // customer-metrics below): a lookup failure must never block order
        // creation, it just means this order records no `merchantTermsUpdatedAt`.
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
          Sentry.withScope((scope) => {
            scope.setTag("webhook.step", "merchant-terms-lookup");
            scope.setTag("businessId", businessId);
            Sentry.captureException(termsLookupError);
          });
        }

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
          termsAcceptedAt: new Date(),
          termsVersion: PLATFORM_TERMS_VERSION,
          merchantTermsUpdatedAt,
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
              orderId: order.id,
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

      // Parallel lane again: an abandoned subscribe session holds no reservation,
      // and the abandoned-checkout email must never fire for it.
      if (expiredSession.mode === "subscription")
        return handleSubscriptionCheckoutExpired(event);

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

      // Abandoned-checkout recovery email — only when the business has opted
      // in and Stripe captured an email before the session expired. The
      // shopper's cart lives in their browser localStorage, so linking back to
      // /cart restores exactly what they left. Note: the expired-session event
      // payload does not include line_items (requires expansion), so the email
      // stays generic — no item names. Stripe sends checkout.session.expired
      // once per session, so no extra idempotency guard is needed; the Resend
      // idempotency key covers redelivered webhook events. Failures never fail
      // the webhook.
      try {
        const abandonedBusinessId = expiredSession.metadata?.businessId;
        const abandonedEmail =
          expiredSession.customer_details?.email ??
          expiredSession.customer_email;
        if (abandonedBusinessId && abandonedEmail) {
          const abandonedBusiness = await db.business.findUnique({
            where: { id: abandonedBusinessId },
            select: {
              name: true,
              ownerEmail: true,
              subdomain: true,
              customDomain: true,
              domainStatus: true,
              sendAbandonedCheckoutEmails: true,
              siteContent: { select: { logoUrl: true } },
            },
          });
          if (abandonedBusiness?.sendAbandonedCheckoutEmails) {
            await sendAbandonedCheckoutEmail({
              to: abandonedEmail,
              customerName: expiredSession.customer_details?.name ?? undefined,
              business: abandonedBusiness,
              idempotencyKey: `abandoned-checkout-${expiredSession.id}`,
            });
          }
        }
      } catch (abandonedErr) {
        Sentry.captureException(abandonedErr, {
          tags: { "webhook.step": "abandoned-checkout-email" },
        });
      }
      return NextResponse.json({ received: true });
    }

    // Handle charge.refunded — covers refunds issued from the Stripe Dashboard
    // (or any source outside the admin `order.refund` mutation). Syncs the
    // cumulative refunded amount onto the order. Idempotent: `amount_refunded`
    // is cumulative, so events that don't increase it are no-ops — including
    // the echo Stripe sends for refunds our own mutation created.
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      try {
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (paymentIntentId) {
          const order = await db.order.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
            include: {
              business: {
                select: {
                  name: true,
                  ownerEmail: true,
                  subdomain: true,
                  customDomain: true,
                  domainStatus: true,
                  siteContent: { select: { logoUrl: true } },
                },
              },
            },
          });

          if (order) {
            const alreadyRecorded = order.refundAmountCents ?? 0;
            const cumulativeRefunded = charge.amount_refunded;

            if (cumulativeRefunded > alreadyRecorded) {
              const isFullRefund = cumulativeRefunded >= order.total;

              await db.order.update({
                where: { id: order.id },
                data: {
                  refundAmountCents: cumulativeRefunded,
                  ...(isFullRefund && {
                    status: "refunded",
                    paymentStatus: "refunded",
                  }),
                },
              });

              // The admin mutation tags its refunds with metadata.source and
              // sends its own customer email; only email here for refunds
              // that originated elsewhere (e.g. the Stripe Dashboard).
              const latestRefund = charge.refunds?.data?.[0];
              const fromAdminMutation =
                latestRefund?.metadata?.source === "simplepress";

              if (!fromAdminMutation) {
                try {
                  await sendOrderRefunded({
                    to: order.customerEmail,
                    orderNumber: order.orderNumber,
                    customerName: order.customerName ?? "Guest",
                    refundAmountCents: cumulativeRefunded - alreadyRecorded,
                    orderTotalCents: order.total,
                    isFullRefund,
                    reason: order.refundReason,
                    business: order.business,
                  });
                } catch (emailError) {
                  Sentry.captureException(emailError, {
                    tags: {
                      "webhook.step": "charge-refunded-email",
                      businessId: order.businessId,
                    },
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { "webhook.step": "charge-refunded" },
        });
      }

      return NextResponse.json({ received: true });
    }

    // Handle disputes (chargebacks). Created: flag the order and alert the
    // owner — response deadlines are strict. Closed: record the outcome.
    if (
      event.type === "charge.dispute.created" ||
      event.type === "charge.dispute.closed"
    ) {
      const dispute = event.data.object;
      try {
        const paymentIntentId =
          typeof dispute.payment_intent === "string"
            ? dispute.payment_intent
            : dispute.payment_intent?.id;

        if (paymentIntentId) {
          const order = await db.order.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
            include: {
              business: {
                select: {
                  name: true,
                  ownerEmail: true,
                  subdomain: true,
                  siteContent: { select: { logoUrl: true } },
                },
              },
            },
          });

          if (order) {
            const stamp = new Date(event.created * 1000).toISOString();
            const amountFormatted = `$${(dispute.amount / 100).toFixed(2)}`;
            const appendNote = (line: string) =>
              order.internalNote ? `${order.internalNote}\n\n${line}` : line;

            if (event.type === "charge.dispute.created") {
              const evidenceDueBy = dispute.evidence_details?.due_by
                ? new Date(dispute.evidence_details.due_by * 1000)
                : null;

              await db.order.update({
                where: { id: order.id },
                data: {
                  paymentStatus: "disputed",
                  internalNote: appendNote(
                    `[${stamp}] Stripe dispute opened — ${amountFormatted} (${dispute.reason}). Respond in the Stripe Dashboard${evidenceDueBy ? ` by ${evidenceDueBy.toISOString().slice(0, 10)}` : ""}.`,
                  ),
                },
              });

              try {
                await sendDisputeAlert({
                  to: order.business.ownerEmail,
                  orderNumber: order.orderNumber,
                  disputeAmountCents: dispute.amount,
                  reason: dispute.reason,
                  evidenceDueBy,
                  business: order.business,
                });
              } catch (emailError) {
                Sentry.captureException(emailError, {
                  tags: {
                    "webhook.step": "dispute-alert-email",
                    businessId: order.businessId,
                  },
                });
              }
            } else {
              // charge.dispute.closed — status is won | lost | warning_closed
              if (dispute.status === "won") {
                await db.order.update({
                  where: { id: order.id },
                  data: {
                    ...(order.paymentStatus === "disputed" && {
                      paymentStatus: "paid",
                    }),
                    internalNote: appendNote(
                      `[${stamp}] Stripe dispute won — ${amountFormatted} returned.`,
                    ),
                  },
                });
              } else if (dispute.status === "lost") {
                const alreadyRecorded = order.refundAmountCents ?? 0;
                const newRefunded = Math.max(alreadyRecorded, dispute.amount);
                await db.order.update({
                  where: { id: order.id },
                  data: {
                    paymentStatus: "refunded",
                    ...(newRefunded >= order.total && { status: "refunded" }),
                    refundAmountCents: newRefunded,
                    internalNote: appendNote(
                      `[${stamp}] Stripe dispute lost — ${amountFormatted} withdrawn.`,
                    ),
                  },
                });
              } else {
                await db.order.update({
                  where: { id: order.id },
                  data: {
                    ...(order.paymentStatus === "disputed" && {
                      paymentStatus: "paid",
                    }),
                    internalNote: appendNote(
                      `[${stamp}] Stripe dispute closed (${dispute.status}).`,
                    ),
                  },
                });
              }
            }
          }
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { "webhook.step": "dispute" },
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
          select: {
            id: true,
            subdomain: true,
            // Read BEFORE the update below so the true→false transition can be
            // detected exactly once. Everything from here down is only used by
            // the owner alert; the update itself is unchanged.
            stripeChargesEnabled: true,
            name: true,
            ownerEmail: true,
            customDomain: true,
            domainStatus: true,
            siteContent: { select: { logoUrl: true } },
          },
        });

        if (business) {
          const chargesEnabled = account.charges_enabled ?? false;

          await db.business.update({
            where: { id: business.id },
            data: {
              stripeChargesEnabled: chargesEnabled,
              stripePayoutsEnabled: account.payouts_enabled ?? false,
            },
          });

          // Stripe just restricted a previously-working account (KYC
          // re-verification, document request, dispute threshold). Nothing in
          // checkout reads `stripeChargesEnabled`, so from this moment every
          // checkout on the store fails opaquely — the owner has no other
          // signal. Fire once, on the edge only: a repeat `account.updated`
          // while charges stay disabled reads `prior === false` and is silent,
          // and a Stripe redelivery of this same event sees the value already
          // written to false. Deliberately not fired on the false→true
          // recovery, nor from the Connect callback (onboarding just finished)
          // or disconnect (deliberate owner action) routes.
          if (business.stripeChargesEnabled && !chargesEnabled) {
            try {
              await sendPaymentsDisabledAlert({
                business,
                adminSettingsUrl: `${getBusinessUrl(business)}/admin/settings/integrations`,
                idempotencyKey: `payments-disabled-${event.id}`,
              });
            } catch (emailError) {
              Sentry.captureException(emailError, {
                tags: {
                  "webhook.step": "payments-disabled-email",
                  businessId: business.id,
                },
              });
            }
          }
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

    // Subscription lifecycle — see src/lib/subscriptions/webhook.ts; every
    // handler re-verifies event.account against the tenant.
    if (event.type === "invoice.paid") return handleInvoicePaid(event);

    if (event.type === "invoice.payment_failed")
      return handleInvoicePaymentFailed(event);

    if (event.type === "invoice.voided") return handleInvoiceVoided(event);

    if (event.type === "customer.subscription.updated")
      return handleSubscriptionUpdated(event);

    if (event.type === "customer.subscription.deleted")
      return handleSubscriptionDeleted(event);

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
