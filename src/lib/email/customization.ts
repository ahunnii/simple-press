import { z } from "zod";

/**
 * Owner-customizable transactional email copy.
 *
 * Overrides are stored on `SiteContent.emailOverrides` as JSON:
 * `{ [templateId]: { subject?: string, introText?: string } }`
 *
 * NOTE: this module is imported from both server code (email senders,
 * tRPC router) and client code (the /admin/emails editor). Keep the
 * top-level of this file free of server-only imports. The server-only
 * `getEmailOverrides` loader (which touches Prisma) lives in
 * `overrides.server.ts` so the registry, zod schema, and pure helpers
 * here stay client-safe.
 */

export type EmailOverride = {
  subject?: string;
  introText?: string;
};

export type CustomizableEmail = {
  /** Stable template id — used as the key in `SiteContent.emailOverrides`. */
  id: string;
  /** Short label shown in the admin editor. */
  label: string;
  /** When/why the email is sent. */
  description: string;
  /**
   * Default subject as a human-readable pattern. `{orderNumber}` and
   * `{businessName}` tokens are replaced at send time.
   */
  defaultSubject: string;
  /** Whether the template renders an owner-provided intro paragraph. */
  supportsIntro: boolean;
};

export const CUSTOMIZABLE_EMAILS = [
  {
    id: "order-confirmation",
    label: "Order Confirmation",
    description:
      "Sent to the customer right after a successful checkout, with their order summary.",
    defaultSubject: "Order #{orderNumber} Confirmed",
    supportsIntro: true,
  },
  {
    id: "order-shipped",
    label: "Order Shipped",
    description:
      "Sent when you add tracking to a shipment, with carrier and tracking details.",
    defaultSubject: "Order #{orderNumber} Has Shipped!",
    supportsIntro: true,
  },
  {
    id: "order-fulfilled",
    label: "Order Fulfilled",
    description:
      "Sent when an order is marked fulfilled without tracking information.",
    defaultSubject: "Order #{orderNumber} has been fulfilled",
    supportsIntro: true,
  },
  {
    id: "order-refunded",
    label: "Order Refunded",
    description: "Sent when you issue a full or partial refund for an order.",
    defaultSubject: "Refund for order #{orderNumber}",
    supportsIntro: true,
  },
  {
    id: "order-cancelled",
    label: "Order Cancelled",
    description: "Sent when an order is cancelled.",
    defaultSubject: "Order #{orderNumber} has been cancelled",
    supportsIntro: true,
  },
  {
    id: "order-ready-for-pickup",
    label: "Ready for Pickup",
    description:
      "Sent when a pickup order is ready to be collected at your location.",
    defaultSubject: "Order #{orderNumber} is ready for pickup",
    supportsIntro: true,
  },
  {
    id: "abandoned-checkout",
    label: "Abandoned Checkout",
    description:
      "Sent to shoppers who started checkout but did not finish (when enabled).",
    defaultSubject: "You left items in your cart at {businessName}",
    supportsIntro: true,
  },
  {
    id: "quote-confirmation",
    label: "Quote Request Received",
    description:
      "Sent to a visitor right after they submit a quote calculator.",
    defaultSubject: "We received your quote request — {businessName}",
    supportsIntro: true,
  },
  {
    id: "final-quote",
    label: "Final Quote",
    description:
      "Sent when you share a final quote from a submission's detail page. The message body is written per-send; only the subject is customizable here.",
    defaultSubject: "Your quote from {businessName}",
    supportsIntro: false,
  },
] as const satisfies readonly CustomizableEmail[];

export type CustomizableEmailId = (typeof CUSTOMIZABLE_EMAILS)[number]["id"];

const CUSTOMIZABLE_EMAIL_IDS: readonly string[] = CUSTOMIZABLE_EMAILS.map(
  (e) => e.id,
);

/** Plain-text guard — reject anything that looks like markup. */
const plainText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !/<[a-z!/]/i.test(value), {
      message: "Plain text only — HTML is not allowed",
    });

export const emailOverrideSchema = z.object({
  subject: plainText(150).optional(),
  introText: plainText(1000).optional(),
});

/**
 * Validates the full `SiteContent.emailOverrides` JSON blob. Keys must be
 * known customizable template ids.
 */
export const emailOverridesSchema = z.record(
  z.string().refine((key) => CUSTOMIZABLE_EMAIL_IDS.includes(key), {
    message: "Unknown email template id",
  }),
  emailOverrideSchema,
);

export type EmailOverrides = z.infer<typeof emailOverridesSchema>;

/**
 * Replace `{orderNumber}` / `{businessName}` tokens in an owner-provided
 * subject pattern.
 */
export function applySubjectTemplate(
  subject: string,
  vars: { orderNumber?: number | string; businessName?: string },
): string {
  return subject
    .replaceAll(
      "{orderNumber}",
      vars.orderNumber !== undefined ? String(vars.orderNumber) : "",
    )
    .replaceAll("{businessName}", vars.businessName ?? "");
}
