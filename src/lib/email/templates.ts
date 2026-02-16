/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import ContactFormEmail from "~/emails/contact-form";
import OrderConfirmationEmail from "~/emails/order-confirmation";
import OrderShippedEmail from "~/emails/order-shipped";
import { TestimonialInviteEmail } from "~/emails/testimonial-invite";
import WelcomeEmail from "~/emails/welcome";

import { env } from "~/env";

import { EMAIL_FROM, sendEmail } from "./send";

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
  business: {
    name: string;
    ownerEmail: string;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
    subdomain: string;
    customDomain?: string | null;
  };
}) {
  const businessUrl = params.business.customDomain
    ? `https://${params.business.customDomain}`
    : `https://${params.business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;

  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name, // ← NEW: Business name in from field
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: `Order #${params.orderNumber} Confirmed`,
    react: OrderConfirmationEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      items: params.items,
      subtotal: params.subtotal,
      shipping: params.shipping,
      tax: params.tax,
      discount: params.discount,
      total: params.total,
      shippingAddress: params.shippingAddress,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
      businessUrl,
    }),
    tags: [
      { name: "category", value: "order_confirmation" },
      { name: "business", value: params.business.subdomain },
    ],
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
  };
}) {
  return sendEmail({
    from: EMAIL_FROM.ORDERS,
    fromName: params.business.name, // ← NEW
    to: params.to,
    replyTo: params.business.ownerEmail,
    subject: `Order #${params.orderNumber} Has Shipped!`,
    react: OrderShippedEmail({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      trackingNumber: params.trackingNumber,
      trackingUrl: params.trackingUrl,
      carrier: params.carrier,
      estimatedDelivery: params.estimatedDelivery,
      businessName: params.business.name,
      businessLogoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "order_shipped" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

// Contact Form Submission (to owner)
export async function sendContactFormSubmission(params: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  business: {
    name: string;
    ownerEmail: string;
  };
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name, // ← NEW
    to: params.business.ownerEmail,
    replyTo: params.email,
    subject:
      params.subject ?? `New Contact Form Submission from ${params.name}`,
    react: ContactFormEmail({
      name: params.name,
      email: params.email,
      subject: params.subject,
      message: params.message,
      businessName: params.business.name,
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
    subdomain: string;
    customDomain?: string | null;
    siteContent?: {
      logoUrl?: string | null;
    } | null;
  };
}) {
  const businessUrl = params.business.customDomain
    ? `https://${params.business.customDomain}`
    : `https://${params.business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;

  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: params.business.name,
    to: params.to,
    subject: `Welcome to ${params.business.name}!`,
    react: WelcomeEmail({
      name: params.name,
      businessName: params.business.name,
      businessUrl,
      logoUrl: params.business.siteContent?.logoUrl ?? undefined,
    }),
    tags: [
      { name: "category", value: "welcome" },
      { name: "business", value: params.business.subdomain },
    ],
  });
}

export async function sendTestimonialInviteEmail({
  to,
  businessName,
  inviteUrl,
}: {
  to: string;
  businessName: string;
  inviteUrl: string;
}) {
  return sendEmail({
    from: EMAIL_FROM.NOREPLY,
    fromName: businessName,
    to,
    subject: `Share your experience with ${businessName}`,
    react: TestimonialInviteEmail({ businessName, inviteUrl }),
  });
}
