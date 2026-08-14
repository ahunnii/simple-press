/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AbandonedCheckoutEmail from "~/emails/abandoned-checkout";
import BackInStockEmail from "~/emails/back-in-stock";
import BackorderAlertEmail from "~/emails/backorder-alert";
import ContactFormEmail from "~/emails/contact-form";
import DisputeAlertEmail from "~/emails/dispute-alert";
import FinalQuoteEmail from "~/emails/final-quote";
import LowInventoryAlertEmail from "~/emails/low-inventory-alert";
import { MarketingBroadcastEmail } from "~/emails/marketing-broadcast";
import NewOrderNotificationEmail from "~/emails/new-order-notification";
import NewQuoteNotificationEmail from "~/emails/new-quote-notification";
import OrderCancelledEmail from "~/emails/order-cancelled";
import OrderConfirmationEmail from "~/emails/order-confirmation";
import OrderFulfilledEmail from "~/emails/order-fulfilled";
import OrderReadyForPickupEmail from "~/emails/order-ready-for-pickup";
import OrderRefundedEmail from "~/emails/order-refunded";
import OrderShippedEmail from "~/emails/order-shipped";
import OrderStatusLinkEmail from "~/emails/order-status-link";
import OutOfStockAlertEmail from "~/emails/out-of-stock-alert";
import PoolLowInventoryAlertEmail from "~/emails/pool-low-inventory-alert";
import PoolOutOfStockAlertEmail from "~/emails/pool-out-of-stock-alert";
import QuoteConfirmationEmail from "~/emails/quote-confirmation";
import { TeamInviteEmail } from "~/emails/team-invite";
import { TestimonialInviteEmail } from "~/emails/testimonial-invite";
import WelcomeEmail from "~/emails/welcome";

import { getBusinessUrl } from "~/lib/business-url";
import { applySubjectTemplate } from "~/lib/email/customization";
import { getEmailOverrides } from "~/lib/email/overrides.server";
import { createOrderStatusToken } from "~/lib/order-status-token";

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

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.customerEmail,
    subject: `New order #${params.orderNumber} — ${params.business.name}`,
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

// Welcome Email
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  business: {
    name: string;
    ownerEmail: string;
    subdomain: string;
    customDomain?: string | null;
    domainStatus?: string | null;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
  };
}) {
  const businessUrl = getBusinessUrl(params.business);

  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: `Welcome to ${params.business.name}!`,
    react: WelcomeEmail({
      name: params.name,
      businessName: params.business.name,
      businessUrl,
      logoUrl: params.business.siteContent?.logoUrl ?? undefined,
      ownerEmail: params.business.ownerEmail,
    }),
    tags: [
      { name: "category", value: "welcome" },
      { name: "business", value: params.business.subdomain },
    ],
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
  formula: string;
  variables: Record<string, number>;
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
      formula: params.formula,
      variables: params.variables,
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

// Final quote — owner-reviewed amount + message, sent from the submission
// detail page. Reply-to is the owner so the conversation continues in email.
export async function sendFinalQuote(params: {
  to: string;
  customerName: string;
  calculatorName: string;
  /** Always exact — the owner reviewed it; there is no range framing here. */
  finalQuoteCents: number;
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
  const defaultSubject = `Your quote from ${params.business.name}`;

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
