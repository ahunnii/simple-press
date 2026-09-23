/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AbandonedCheckoutEmail from "~/emails/abandoned-checkout";
import BackInStockEmail from "~/emails/back-in-stock";
import BackorderAlertEmail from "~/emails/backorder-alert";
import ContactFormEmail from "~/emails/contact-form";
import DisputeAlertEmail from "~/emails/dispute-alert";
import FinalQuoteEmail from "~/emails/final-quote";
import FormConfirmationEmail from "~/emails/form-confirmation";
import LowInventoryAlertEmail from "~/emails/low-inventory-alert";
import LoyaltyBirthdayEmail from "~/emails/loyalty-birthday";
import LoyaltyRewardRedeemedEmail from "~/emails/loyalty-reward-redeemed";
import { MarketingBroadcastEmail } from "~/emails/marketing-broadcast";
import NewDonationNotificationEmail from "~/emails/new-donation-notification";
import NewFormSubmissionNotificationEmail from "~/emails/new-form-submission-notification";
import NewOrderNotificationEmail from "~/emails/new-order-notification";
import NewQuoteNotificationEmail from "~/emails/new-quote-notification";
import NewReviewEmail from "~/emails/new-review";
import OrderCancelledEmail from "~/emails/order-cancelled";
import OrderConfirmationEmail from "~/emails/order-confirmation";
import OrderFulfilledEmail from "~/emails/order-fulfilled";
import OrderReadyForPickupEmail from "~/emails/order-ready-for-pickup";
import OrderRefundedEmail from "~/emails/order-refunded";
import OrderShippedEmail from "~/emails/order-shipped";
import OrderStatusLinkEmail from "~/emails/order-status-link";
import OutOfStockAlertEmail from "~/emails/out-of-stock-alert";
import OwnerSubscriptionNotificationEmail from "~/emails/owner-subscription-notification";
import PaymentsDisabledEmail from "~/emails/payments-disabled";
import PoolLowInventoryAlertEmail from "~/emails/pool-low-inventory-alert";
import PoolOutOfStockAlertEmail from "~/emails/pool-out-of-stock-alert";
import QuoteConfirmationEmail from "~/emails/quote-confirmation";
import SubscriptionCancelledEmail from "~/emails/subscription-cancelled";
import SubscriptionManageLinksEmail from "~/emails/subscription-manage-links";
import SubscriptionPaymentFailedEmail from "~/emails/subscription-payment-failed";
import SubscriptionStartedEmail from "~/emails/subscription-started";
import SubscriptionUpdatedEmail from "~/emails/subscription-updated";
import { TeamInviteEmail } from "~/emails/team-invite";
import { TestimonialInviteEmail } from "~/emails/testimonial-invite";

import type { DonationLabel } from "~/lib/donations/label";
import { getBusinessUrl } from "~/lib/business-url";
import { applySubjectTemplate } from "~/lib/email/customization";
import { getEmailOverrides } from "~/lib/email/overrides.server";
import { createOrderStatusToken } from "~/lib/order-status-token";
import { formatPrice } from "~/lib/prices";

import { EMAIL_FROM, sendEmail } from "./send";

/**
 * Build a signed guest order-status URL for an order, or undefined
 * when no orderId is available (older call sites).
 */
function buildOrderStatusUrl(
  businessUrl: string,
  orderId?: string,
): string | undefined {
  if (!orderId) return undefined;
  return `${businessUrl}/order-status/${createOrderStatusToken(orderId)}`;
}

// Order Confirmation
export async function sendOrderConfirmation(params: {
  to: string;
  orderNumber: number;
  customerName: string;
  items: Array<any>;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  shippingAddress?: any;
  deliveryMethod?: "ship" | "pickup";
  pickupLocation?: string;
  pickupInstructions?: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  /** When provided, a signed "View order status" link is included in the email. */
  orderId?: string;
  /** When provided, a "Manage your subscription" link is shown in the email. */
  subscriptionManageUrl?: string;
  /** When provided with earned > 0, a "You earned N points" block is shown in the email. */
  loyalty?: { earned: number; balance: number };
  idempotencyKey?: string;
}) {
  const businessUrl = getBusinessUrl(params.business);
  const orderStatusUrl = buildOrderStatusUrl(businessUrl, params.orderId);
  const isPickup = params.deliveryMethod === "pickup";
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["order-confirmation"];
  const defaultSubject = isPickup
    ? `Order #${params.orderNumber} confirmed — pickup details inside`
    : `Order #${params.orderNumber} Confirmed`;

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          orderNumber: params.orderNumber,
          businessName: params.business.name,
        })
      : defaultSubject,
    react: OrderConfirmationEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      introText: override?.introText,
      items: params.items,
      subtotal: params.subtotal,
      shipping: params.shipping,
      tax: params.tax,
      discount: params.discount,
      total: params.total,
      shippingAddress: params.shippingAddress,
      deliveryMethod: params.deliveryMethod,
      pickupLocation: params.pickupLocation,
      pickupInstructions: params.pickupInstructions,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      businessUrl,
      orderStatusUrl,
      subscriptionManageUrl: params.subscriptionManageUrl,
      loyalty: params.loyalty
        ? { ...params.loyalty, rewardsUrl: `${businessUrl}/account/rewards` }
        : undefined,
    }),
    tags: [
      { name: "category", value: "order_confirmation" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// New order — notify store owner (platform email)
export async function sendNewOrderNotification(params: {
  to: string;
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productName: string;
    variantName: string | null;
    quantity: number;
    total: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  deliveryMethod?: "ship" | "pickup";
  /** Present when this order was created from a paid subscription invoice — lets the owner tell a renewal from a one-off. */
  subscription?: { intervalLabel: string; adminUrl: string };
  business: {
    name: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  const adminOrderUrl = `${getBusinessUrl(params.business)}/admin/orders/${params.orderId}`;
  const subject = params.subscription
    ? `New subscription order #${params.orderNumber} — ${params.business.name}`
    : `New order #${params.orderNumber} — ${params.business.name}`;

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.customerEmail,
    subject,
    react: NewOrderNotificationEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      items: params.items,
      subtotal: params.subtotal,
      shipping: params.shipping,
      tax: params.tax,
      discount: params.discount,
      total: params.total,
      deliveryMethod: params.deliveryMethod,
      subscription: params.subscription,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      adminOrderUrl,
    }),
    tags: [
      { name: "category", value: "new_order_owner" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Order Shipped
export async function sendOrderShipped(params: {
  to: string;
  orderNumber: number;
  customerName: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
  estimatedDelivery?: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  /** When provided, a signed "View order status" link is included in the email. */
  orderId?: string;
}) {
  const businessUrl = getBusinessUrl(params.business);
  const orderStatusUrl = buildOrderStatusUrl(businessUrl, params.orderId);
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["order-shipped"];

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name, // ← NEW
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          orderNumber: params.orderNumber,
          businessName: params.business.name,
        })
      : `Order #${params.orderNumber} Has Shipped!`,
    react: OrderShippedEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      introText: override?.introText,
      trackingNumber: params.trackingNumber,
      trackingUrl: params.trackingUrl,
      carrier: params.carrier,
      estimatedDelivery: params.estimatedDelivery,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      orderStatusUrl,
    }),
    tags: [
      { name: "category", value: "order_shipped" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Order marked fulfilled without tracking (customer)
export async function sendOrderFulfilled(params: {
  to: string;
  orderNumber: number;
  customerName: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
}) {
  const businessUrl = getBusinessUrl(params.business);
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["order-fulfilled"];

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          orderNumber: params.orderNumber,
          businessName: params.business.name,
        })
      : `Order #${params.orderNumber} has been fulfilled`,
    react: OrderFulfilledEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      introText: override?.introText,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      businessUrl,
    }),
    tags: [
      { name: "category", value: "order_fulfilled" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Refund confirmation (customer)
export async function sendOrderRefunded(params: {
  to: string;
  orderNumber: number;
  customerName: string;
  refundAmountCents: number;
  orderTotalCents: number;
  isFullRefund: boolean;
  reason?: string | null;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
}) {
  const businessUrl = getBusinessUrl(params.business);
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["order-refunded"];
  const defaultSubject = params.isFullRefund
    ? `Refund for order #${params.orderNumber}`
    : `Partial refund for order #${params.orderNumber}`;

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          orderNumber: params.orderNumber,
          businessName: params.business.name,
        })
      : defaultSubject,
    react: OrderRefundedEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      introText: override?.introText,
      refundAmountCents: params.refundAmountCents,
      orderTotalCents: params.orderTotalCents,
      isFullRefund: params.isFullRefund,
      reason: params.reason,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      businessUrl,
    }),
    tags: [
      { name: "category", value: "order_refunded" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Dispute Alert (owner)
export async function sendDisputeAlert(params: {
  to: string;
  orderNumber: number;
  disputeAmountCents: number;
  reason: string;
  evidenceDueBy?: Date | null;
  business: {
    name: string;
    subdomain: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
  };
}) {
  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    subject: `Payment dispute opened on order #${params.orderNumber}`,
    react: DisputeAlertEmail({
      orderNumber: params.orderNumber,
      disputeAmountFormatted: `$${(params.disputeAmountCents / 100).toFixed(2)}`,
      reason: params.reason,
      evidenceDueBy: params.evidenceDueBy
        ? params.evidenceDueBy.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : undefined,
      stripeDashboardUrl: "https://dashboard.stripe.com/disputes",
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "dispute_alert" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Order Cancelled (customer)
export async function sendOrderCancelled(params: {
  to: string;
  orderNumber: number;
  customerName: string;
  reason?: string | null;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
}) {
  const businessUrl = getBusinessUrl(params.business);
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["order-cancelled"];

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          orderNumber: params.orderNumber,
          businessName: params.business.name,
        })
      : `Order #${params.orderNumber} has been cancelled`,
    react: OrderCancelledEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      introText: override?.introText,
      reason: params.reason,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      businessUrl,
    }),
    tags: [
      { name: "category", value: "order_cancelled" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Guest order-status link (customer)
export async function sendOrderStatusLink(params: {
  to: string;
  orderNumber: number;
  customerName: string;
  orderStatusUrl: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
  };
}) {
  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: `Your order status link for order #${params.orderNumber}`,
    react: OrderStatusLinkEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      orderStatusUrl: params.orderStatusUrl,
    }),
    tags: [
      { name: "category", value: "order_status_link" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Abandoned Checkout Recovery (customer) — sent from the
// checkout.session.expired webhook when the business has opted in.
export async function sendAbandonedCheckoutEmail(params: {
  to: string;
  customerName?: string | null;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  const businessUrl = getBusinessUrl(params.business);
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["abandoned-checkout"];

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          businessName: params.business.name,
        })
      : `You left items in your cart at ${params.business.name}`,
    react: AbandonedCheckoutEmail({
      customerName: params.customerName ?? undefined,
      introText: override?.introText,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      businessUrl,
    }),
    tags: [
      { name: "category", value: "abandoned_checkout" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Contact Form Submission (to owner)
export async function sendContactFormSubmission(params: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
  preferredContactMethod?: "email" | "phone" | "no-preference";
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
  };
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    replyTo: params.email,
    subject:
      params.subject ?? `New Contact Form Submission from ${params.name}`,
    react: ContactFormEmail({
      name: params.name,
      email: params.email,
      phone: params.phone,
      preferredContactMethod: params.preferredContactMethod ?? "no-preference",
      subject: params.subject,
      message: params.message,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [{ name: "category", value: "contact_form" }],
  });
}

type InventoryAlertBusiness = {
  name: string;
  ownerEmail: string;
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
  siteContent?: { logoUrl?: string | null } | null;
};

// Low inventory threshold alert (to owner)
export async function sendLowInventoryAlert(params: {
  productName: string;
  variantName?: string;
  currentQty: number;
  threshold: number;
  adminProductUrl: string;
  business: InventoryAlertBusiness;
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    subject: `Low inventory alert: ${params.productName}`,
    react: LowInventoryAlertEmail({
      productName: params.productName,
      variantName: params.variantName,
      currentQty: params.currentQty,
      threshold: params.threshold,
      adminProductUrl: params.adminProductUrl,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "low_inventory_alert" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Out of stock alert — backorders disabled (to owner)
export async function sendOutOfStockAlert(params: {
  productName: string;
  variantName?: string;
  adminProductUrl: string;
  business: InventoryAlertBusiness;
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    subject: `Out of stock: ${params.productName}`,
    react: OutOfStockAlertEmail({
      productName: params.productName,
      variantName: params.variantName,
      adminProductUrl: params.adminProductUrl,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "out_of_stock_alert" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Out of stock alert — backorders enabled (to owner)
export async function sendBackorderAlert(params: {
  productName: string;
  variantName?: string;
  adminProductUrl: string;
  business: InventoryAlertBusiness;
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    subject: `Out of stock (backorders on): ${params.productName}`,
    react: BackorderAlertEmail({
      productName: params.productName,
      variantName: params.variantName,
      adminProductUrl: params.adminProductUrl,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "backorder_alert" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Pool (base inventory unit) low-stock alert
export async function sendPoolLowInventoryAlert(params: {
  poolName: string;
  currentQty: number;
  threshold: number;
  adminUrl: string;
  business: InventoryAlertBusiness;
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    subject: `Low base unit stock: ${params.poolName}`,
    react: PoolLowInventoryAlertEmail({
      poolName: params.poolName,
      currentQty: params.currentQty,
      threshold: params.threshold,
      adminUrl: params.adminUrl,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "pool_low_inventory_alert" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Pool (base inventory unit) out-of-stock alert
export async function sendPoolOutOfStockAlert(params: {
  poolName: string;
  adminUrl: string;
  business: InventoryAlertBusiness;
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    subject: `Base unit out of stock: ${params.poolName}`,
    react: PoolOutOfStockAlertEmail({
      poolName: params.poolName,
      adminUrl: params.adminUrl,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "pool_out_of_stock_alert" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

/**
 * Stripe has disabled charges on the owner's connected account (to owner).
 *
 * Sent from the `account.updated` Stripe webhook on a true→false transition of
 * `Business.stripeChargesEnabled` only — see the transition guard there. This
 * is the store's most severe operational failure: every checkout fails, and
 * without this email the owner's first signal is an angry customer.
 */
export async function sendPaymentsDisabledAlert(params: {
  adminSettingsUrl?: string;
  idempotencyKey?: string;
  business: {
    name: string;
    ownerEmail: string;
    subdomain: string;
    siteContent?: { logoUrl?: string | null } | null;
  };
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    subject: `Action required: ${params.business.name} can't accept payments`,
    react: PaymentsDisabledEmail({
      businessName: params.business.name,
      stripeDashboardUrl: "https://dashboard.stripe.com",
      adminSettingsUrl: params.adminSettingsUrl,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "payments_disabled" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Order Ready for Pickup (customer)
export async function sendOrderReadyForPickup(params: {
  to: string;
  orderNumber: number;
  customerName?: string;
  pickupLocation?: string;
  pickupInstructions?: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent: { logoUrl: string | null } | null;
    subdomain: string;
    customDomain: string | null;
    domainStatus: string | null;
  };
}): Promise<ReturnType<typeof sendEmail>> {
  const businessUrl = getBusinessUrl(params.business);
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["order-ready-for-pickup"];

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          orderNumber: params.orderNumber,
          businessName: params.business.name,
        })
      : `Order #${params.orderNumber} is ready for pickup`,
    react: OrderReadyForPickupEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      introText: override?.introText,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      businessUrl,
      pickupLocation: params.pickupLocation,
      pickupInstructions: params.pickupInstructions,
    }),
    tags: [
      { name: "category", value: "order_ready_for_pickup" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

export async function sendTestimonialInviteEmail({
  to,
  businessName,
  inviteUrl,
  logoUrl,
  ownerEmail,
}: {
  to: string;
  businessName: string;
  inviteUrl: string;
  logoUrl?: string;
  ownerEmail?: string;
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: businessName,
    to,
    replyTo: ownerEmail,
    subject: `Share your experience with ${businessName}`,
    react: TestimonialInviteEmail({
      businessName,
      inviteUrl,
      logoUrl,
      ownerEmail,
    }),
    tags: [{ name: "category", value: "testimonial_invite" }],
  });
}

export async function sendMarketingBroadcast({
  to,
  subject,
  business,
  body,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  business: {
    name: string;
    ownerEmail?: string | null;
    siteContent?: { logoUrl?: string | null } | null;
  };
  body: string;
  unsubscribeUrl: string;
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: business.name,
    to,
    replyTo: business.ownerEmail ?? undefined,
    subject,
    react: MarketingBroadcastEmail({
      businessName: business.name,
      logoUrl: business.siteContent?.logoUrl ?? undefined,
      body,
      unsubscribeUrl,
    }),
    tags: [{ name: "category", value: "marketing_broadcast" }],
    // RFC 8058 one-click unsubscribe — lets mail clients POST to the
    // unsubscribe endpoint (handled by /api/unsubscribe POST) without a visit.
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

export async function sendTeamInviteEmail({
  to,
  businessName,
  inviteUrl,
  role,
  logoUrl,
  ownerEmail,
}: {
  to: string;
  businessName: string;
  inviteUrl: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  logoUrl?: string;
  ownerEmail?: string;
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: businessName,
    to,
    replyTo: ownerEmail,
    subject: `You've been invited to join ${businessName}`,
    react: TeamInviteEmail({
      businessName,
      inviteUrl,
      role,
      logoUrl,
      ownerEmail,
    }),
    tags: [{ name: "category", value: "team_invite" }],
  });
}

// Back in stock — notify a shopper who asked to hear when an item returned
export async function sendBackInStockEmail(params: {
  to: string;
  productName: string;
  variantName?: string;
  productUrl: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
}) {
  const displayName = params.variantName
    ? `${params.productName} (${params.variantName})`
    : params.productName;

  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: `${displayName} is back in stock`,
    react: BackInStockEmail({
      productName: params.productName,
      variantName: params.variantName,
      productUrl: params.productUrl,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "back_in_stock" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Quote request received (customer)
export async function sendQuoteConfirmation(params: {
  to: string;
  customerName: string;
  calculatorName: string;
  responseDays: number;
  answers: Array<{ title: string; display: string }>;
  /** Present only when the calculator's `showEstimateToCustomer` is on. */
  estimate?: { exactCents: number } | { lowCents: number; highCents: number };
  business: {
    name: string;
    ownerEmail: string;
    supportEmail?: string | null;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
  };
  idempotencyKey?: string;
}) {
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["quote-confirmation"];
  const defaultSubject = `We received your quote request — ${params.business.name}`;

  return sendEmail({
    from: EMAIL_FROM.SUPPORT,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.supportEmail ?? params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          businessName: params.business.name,
        })
      : defaultSubject,
    react: QuoteConfirmationEmail({
      customerName: params.customerName,
      introText: override?.introText,
      calculatorName: params.calculatorName,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      ownerEmail: params.business.ownerEmail,
      responseDays: params.responseDays,
      answers: params.answers,
      estimate: params.estimate,
    }),
    tags: [
      { name: "category", value: "quote_confirmation" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// New quote request — notify store owner
export async function sendNewQuoteNotification(params: {
  submissionId: string;
  calculatorName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  /** Null when the formula could not be evaluated for this submission. */
  estimateCents: number | null;
  answers: Array<{ title: string; display: string; hidden: boolean }>;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  const adminQuoteUrl = `${getBusinessUrl(params.business)}/admin/quotes/${params.submissionId}`;

  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    replyTo: params.contactEmail,
    subject: `New quote request — ${params.calculatorName}`,
    react: NewQuoteNotificationEmail({
      calculatorName: params.calculatorName,
      contactName: params.contactName,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone ?? undefined,
      estimateCents: params.estimateCents,
      answers: params.answers,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      adminQuoteUrl,
    }),
    tags: [
      { name: "category", value: "new_quote_owner" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Form submission received (submitter) — sent only when the owner set a
// confirmation field and the submitter answered it with a valid email.
export async function sendFormConfirmation(params: {
  to: string;
  formId: string;
  formName: string;
  /** Owner's confirmationMessage, plain text. */
  message: string;
  /** Owner's confirmationSubject; falls back to the default literal when blank. */
  subject: string;
  answers: Array<{ label: string; value: string }>;
  business: {
    name: string;
    ownerEmail: string;
    supportEmail?: string | null;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
  };
  idempotencyKey?: string;
}) {
  return sendEmail({
    from: EMAIL_FROM.SUPPORT,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.supportEmail ?? params.business.ownerEmail,
    subject: applySubjectTemplate(params.subject, {
      businessName: params.business.name,
    }),
    react: FormConfirmationEmail({
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      message: params.message,
      formName: params.formName,
      answers: params.answers,
    }),
    tags: [
      { name: "category", value: "form-confirmation" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// New form submission — notify store owner
export async function sendNewFormSubmissionNotification(params: {
  submissionId: string;
  formId: string;
  formName: string;
  submittedAt: Date;
  answers: Array<{ label: string; value: string }>;
  /** submitterEmail from the entry, when the visitor gave one — used as replyTo. */
  submitterEmail?: string | null;
  /** Owner's configured notify address, already resolved (notifyEmail ?? supportEmail ?? ownerEmail). */
  notifyTo: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  const adminEntryUrl = `${getBusinessUrl(params.business)}/admin/forms/${params.formId}/entries/${params.submissionId}`;

  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.notifyTo,
    replyTo: params.submitterEmail ?? params.business.ownerEmail,
    subject: `New submission: ${params.formName}`,
    react: NewFormSubmissionNotificationEmail({
      formName: params.formName,
      submittedAt: params.submittedAt,
      answers: params.answers,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      adminEntryUrl,
    }),
    tags: [
      { name: "category", value: "form-submission" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Final quote — owner-reviewed amount + message, sent from the submission
// detail page. Reply-to is the owner so the conversation continues in email.
export async function sendFinalQuote(params: {
  to: string;
  customerName: string;
  calculatorName: string;
  /**
   * Always exact when present — the owner reviewed it; there is no range
   * framing here.
   *
   * `null` is a MESSAGE-ONLY follow-up, not a $0 quote: the owner is writing
   * back to ask something ("can you send photos of the stairs?") or to decline
   * ("we don't cover that area"), and the email drops the amount box entirely
   * rather than printing a price nobody quoted. The subject changes with it —
   * "Your quote from X" landing in an inbox with no quote in it is worse than
   * no email at all.
   */
  finalQuoteCents: number | null;
  /** Owner-written message for this send. Plain text. */
  message: string;
  answers: Array<{ title: string; display: string }>;
  business: {
    name: string;
    ownerEmail: string;
    supportEmail?: string | null;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
  };
  idempotencyKey?: string;
}) {
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["final-quote"];
  // Only the DEFAULT subject splits on the amount. An owner who wrote their own
  // subject line keeps it in both cases — it is one string on the template's
  // customization row, they cannot author two, and silently ignoring their
  // wording on some sends would be the more surprising behavior.
  const defaultSubject =
    params.finalQuoteCents === null
      ? `An update on your quote request — ${params.business.name}`
      : `Your quote from ${params.business.name}`;

  return sendEmail({
    from: EMAIL_FROM.SUPPORT,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.supportEmail ?? params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          businessName: params.business.name,
        })
      : defaultSubject,
    react: FinalQuoteEmail({
      customerName: params.customerName,
      calculatorName: params.calculatorName,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      ownerEmail: params.business.ownerEmail,
      message: params.message,
      finalQuoteCents: params.finalQuoteCents,
      answers: params.answers,
    }),
    tags: [
      { name: "category", value: "final_quote" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// New customer review awaiting moderation (to owner). Only ever sent for
// customer-submitted reviews — `review.submit` always creates with
// `isApproved: false`. Owner-created reviews (`review.ownerCreate`, which
// default `isApproved: true`) go through a separate mutation that never
// calls this.
export async function sendNewReviewNotification(params: {
  reviewerName: string;
  productName: string;
  rating: number;
  reviewTitle?: string;
  reviewText: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
}) {
  const adminReviewsUrl = `${getBusinessUrl(params.business)}/admin/reviews`;

  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    subject: `New review for ${params.productName}`,
    react: NewReviewEmail({
      reviewerName: params.reviewerName,
      productName: params.productName,
      rating: params.rating,
      reviewTitle: params.reviewTitle,
      reviewText: params.reviewText,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      adminReviewsUrl,
    }),
    tags: [
      { name: "category", value: "new_review" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

/**
 * How a subscription email addresses the customer.
 *
 * `Subscription.customerName` is the name they typed on the Subscribe form
 * (encrypted at rest, so it is passed in rather than looked up here). Falling
 * back to the email's local-part greets a real person as "Hi jane.smith1987"
 * — acceptable only when no name was ever captured.
 */
function customerGreetingName(params: {
  to: string;
  customerName?: string | null;
}): string {
  const name = params.customerName?.trim();
  if (name) return name;
  return params.to.split("@")[0] ?? params.to;
}

// Subscription Started (customer)
export async function sendSubscriptionStarted(params: {
  to: string;
  /** The customer's own name, when the subscription row has one. */
  customerName?: string | null;
  productName: string;
  variantName?: string | null;
  quantity: number;
  intervalLabel: string;
  perDeliveryCents: number;
  nextBillingAt?: Date | null;
  deliveryMethod: "ship" | "pickup";
  shippingAddressLines?: string[];
  manageUrl: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["subscription-started"];

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          businessName: params.business.name,
        })
      : `Your ${params.productName} subscription is confirmed`,
    react: SubscriptionStartedEmail({
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      customerName: customerGreetingName(params),
      productName: params.productName,
      variantName: params.variantName,
      quantity: params.quantity,
      intervalLabel: params.intervalLabel,
      perDeliveryCents: params.perDeliveryCents,
      nextBillingAt: params.nextBillingAt ?? undefined,
      deliveryMethod: params.deliveryMethod,
      shippingAddressLines: params.shippingAddressLines,
      manageUrl: params.manageUrl,
    }),
    tags: [
      { name: "category", value: "subscription_started" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Subscription Payment Failed (customer)
export async function sendSubscriptionPaymentFailed(params: {
  to: string;
  /** The customer's own name, when the subscription row has one. */
  customerName?: string | null;
  productName: string;
  intervalLabel: string;
  perDeliveryCents: number;
  manageUrl: string;
  attemptCount?: number;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["subscription-payment-failed"];

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          businessName: params.business.name,
        })
      : `Action needed: payment for your ${params.productName} subscription`,
    react: SubscriptionPaymentFailedEmail({
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      customerName: customerGreetingName(params),
      productName: params.productName,
      intervalLabel: params.intervalLabel,
      perDeliveryCents: params.perDeliveryCents,
      manageUrl: params.manageUrl,
      attemptCount: params.attemptCount,
    }),
    tags: [
      { name: "category", value: "subscription_payment_failed" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Subscription Cancelled (customer)
export async function sendSubscriptionCancelled(params: {
  to: string;
  /** The customer's own name, when the subscription row has one. */
  customerName?: string | null;
  productName: string;
  variantName?: string | null;
  intervalLabel: string;
  cancelledAt: Date;
  manageUrl?: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["subscription-cancelled"];

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          businessName: params.business.name,
        })
      : `Your ${params.productName} subscription has been cancelled`,
    react: SubscriptionCancelledEmail({
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      customerName: customerGreetingName(params),
      productName: params.productName,
      variantName: params.variantName,
      intervalLabel: params.intervalLabel,
      cancelledAt: params.cancelledAt,
      manageUrl: params.manageUrl,
    }),
    tags: [
      { name: "category", value: "subscription_cancelled" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Subscription Updated (customer) — for pause/resume/skip
export async function sendSubscriptionUpdated(params: {
  to: string;
  /** The customer's own name, when the subscription row has one. */
  customerName?: string | null;
  productName: string;
  variantName?: string | null;
  intervalLabel: string;
  variant: "paused" | "resumed" | "skipped";
  /** `resumed` only: the customer undid a pending skip rather than lifting a pause. */
  undoSkip?: boolean;
  resumesAt?: Date | null;
  nextBillingAt?: Date | null;
  manageUrl: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  const overrides = await getEmailOverrides(params.business.subdomain);
  const override = overrides["subscription-updated"];

  let defaultSubject: string;
  if (params.variant === "paused") {
    defaultSubject = "Your subscription is paused";
  } else if (params.variant === "resumed") {
    defaultSubject = params.undoSkip
      ? "Your next delivery is back on"
      : "Your subscription is back on";
  } else {
    defaultSubject = "Your next delivery is skipped";
  }

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: override?.subject
      ? applySubjectTemplate(override.subject, {
          businessName: params.business.name,
        })
      : defaultSubject,
    react: SubscriptionUpdatedEmail({
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      customerName: customerGreetingName(params),
      productName: params.productName,
      variantName: params.variantName,
      intervalLabel: params.intervalLabel,
      variant: params.variant,
      undoSkip: params.undoSkip,
      resumesAt: params.resumesAt ?? undefined,
      nextBillingAt: params.nextBillingAt ?? undefined,
      manageUrl: params.manageUrl,
    }),
    tags: [
      { name: "category", value: "subscription_updated" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Subscription Manage Links (customer) — for lookup
export async function sendSubscriptionManageLinks(params: {
  to: string;
  links: Array<{
    productName: string;
    variantName?: string | null;
    intervalLabel: string;
    status: string;
    manageUrl: string;
  }>;
  business: {
    name: string;
    // Required so `replyTo` reaches the merchant: the template tells the
    // customer to reply to this email, and without it replies land on the
    // platform's `orders@` address where nobody is watching for them.
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: `Manage your ${params.business.name} subscriptions`,
    react: SubscriptionManageLinksEmail({
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      links: params.links,
    }),
    tags: [
      { name: "category", value: "subscription_manage_link" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// Owner Subscription Notification (owner) — for new, cancelled, and payment_failed
export async function sendOwnerSubscriptionNotification(params: {
  kind: "new" | "cancelled" | "payment_failed";
  customerEmail: string;
  customerName?: string | null;
  productName: string;
  variantName?: string | null;
  quantity: number;
  intervalLabel: string;
  perDeliveryCents: number;
  adminUrl: string;
  /** Only meaningful when `kind === "cancelled"`. Raw `Subscription.cancelReason` value. */
  cancelReason?: string | null;
  /** Only meaningful when `kind === "payment_failed"`. Stripe's `attempt_count` on the invoice. */
  attemptCount?: number;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  idempotencyKey?: string;
}) {
  const category =
    params.kind === "new"
      ? "subscription_owner_new"
      : params.kind === "payment_failed"
        ? "subscription_owner_payment_failed"
        : "subscription_owner_cancelled";
  const defaultSubject =
    params.kind === "new"
      ? `New subscription: ${params.productName}`
      : params.kind === "payment_failed"
        ? "Payment failed for a subscription"
        : `Subscription cancelled: ${params.productName}`;

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    replyTo: params.customerEmail,
    subject: defaultSubject,
    react: OwnerSubscriptionNotificationEmail({
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      kind: params.kind,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      productName: params.productName,
      variantName: params.variantName,
      quantity: params.quantity,
      intervalLabel: params.intervalLabel,
      perDeliveryCents: params.perDeliveryCents,
      adminUrl: params.adminUrl,
      cancelReason: params.cancelReason,
      attemptCount: params.attemptCount,
    }),
    tags: [
      { name: "category", value: category },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// New Donation Notification (owner) — the only email the donation lane sends.
// The donor gets Stripe's own receipt from the connected account; SimplePress
// has nothing to add to it and no manage link to offer.
export async function sendOwnerDonationNotification(params: {
  /** Resolved from `Business.donationLabel` by the caller — one wording per store. */
  label: DonationLabel;
  amountCents: number;
  donorName?: string | null;
  donorEmail?: string | null;
  message?: string | null;
  adminUrl: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
  /**
   * `donation-owner-<sessionId>`. Belt and braces with the webhook's
   * `stripeSessionId` uniqueness check: a redelivered event that loses the race
   * against the DB read still cannot produce a second email.
   */
  idempotencyKey?: string;
}) {
  const noun = params.label.noun.toLowerCase();

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.business.ownerEmail,
    // Only when the donor actually left an address — an anonymous donation has
    // nobody to reply to, and `replyTo: undefined` correctly falls back to the
    // platform `from`.
    replyTo: params.donorEmail ?? undefined,
    subject: `New ${noun} to ${params.business.name}`,
    react: NewDonationNotificationEmail({
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      label: params.label,
      amountCents: params.amountCents,
      donorName: params.donorName,
      donorEmail: params.donorEmail,
      message: params.message,
      adminUrl: params.adminUrl,
    }),
    tags: [
      { name: "category", value: "donation" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: params.idempotencyKey,
  });
}

// ─── Loyalty rewards ───

/**
 * Reward code redeemed — sent by the loyalty `redeem` tRPC procedure right
 * after it mints the `DiscountCode` row for the customer's redemption.
 *
 * `idempotencyKey` is keyed on the minted `DiscountCode.id`, not the
 * customer or a timestamp: a redemption creates exactly one discount code
 * row, so keying on that row's id is what makes a client retry of the same
 * `redeem` call (or any other duplicate invocation) unable to send the code
 * twice.
 */
export async function sendLoyaltyRewardRedeemedEmail(params: {
  to: string;
  customerName?: string | null;
  code: string;
  rewardLabel: string;
  rewardDescription: string;
  expiresAt: Date | null;
  minPurchaseCents?: number | null;
  pointsSpent: number;
  balance: number;
  discountCodeId: string;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
}) {
  const businessUrl = getBusinessUrl(params.business);
  const expiresAt = params.expiresAt
    ? params.expiresAt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "no expiration";

  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: `Your ${params.business.name} reward code`,
    react: LoyaltyRewardRedeemedEmail({
      customerName: params.customerName,
      code: params.code,
      rewardLabel: params.rewardLabel,
      rewardDescription: params.rewardDescription,
      expiresAt,
      minPurchase:
        params.minPurchaseCents != null
          ? formatPrice(params.minPurchaseCents)
          : undefined,
      pointsSpent: params.pointsSpent,
      balance: params.balance,
      shopUrl: businessUrl,
      rewardsUrl: `${businessUrl}/account/rewards`,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "loyalty_reward_redeemed" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: `loyalty-redeem-${params.discountCodeId}`,
  });
}

/**
 * Birthday bonus awarded — sent by the daily birthday cron job after it
 * awards a `birthday_bonus` ledger row for the customer.
 *
 * `idempotencyKey` is keyed on `<customerId>-<year>`, the same shape as the
 * ledger's own `birthday:<customerId>:<YYYY>` idempotency key (see
 * `src/lib/loyalty/birthday.ts`) — a re-run of the cron for a customer
 * already credited this year (e.g. a retried job, or the sweep catching a
 * customer twice) can never send a second email for the same birthday.
 */
export async function sendLoyaltyBirthdayEmail(params: {
  to: string;
  customerName?: string | null;
  points: number;
  balance: number;
  customerId: string;
  year: number;
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
  };
}) {
  const businessUrl = getBusinessUrl(params.business);

  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: `Happy birthday from ${params.business.name}!`,
    react: LoyaltyBirthdayEmail({
      customerName: params.customerName,
      points: params.points,
      balance: params.balance,
      rewardsUrl: `${businessUrl}/account/rewards`,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "loyalty_birthday" },
      { name: "business", value: params.business.subdomain },
    ],
    idempotencyKey: `loyalty-birthday-${params.customerId}-${params.year}`,
  });
}
