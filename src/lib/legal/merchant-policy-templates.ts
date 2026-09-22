import type { SupportedCountry } from "~/lib/geo/regions";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { resolveFlags } from "~/lib/features/resolve-flags";
import {
  COUNTRY_LABELS,
  getAllowedCountries,
  US_STATES,
} from "~/lib/geo/regions";
import { formatPrice } from "~/lib/prices";

/**
 * Snapshot inputs for merchant policy starters.
 *
 * This generates a static document at **Use Template** time — not a live
 * binding. If shipping countries, rates, or feature flags change later, an
 * already-saved policy will not update until the owner regenerates it.
 */
export type PolicyBusiness = {
  name: string;
  supportEmail: string | null;
  ownerEmail: string;
  salesCountries: string[];
  businessAddress: string | null;
  addressState: string | null;
  phoneNumber: string | null;
  shippingType: string;
  shippingFlatRate: number | null;
  freeShippingThreshold: number | null;
  offersInStorePickup: boolean;
  pickupLocation: string | null;
  pickupInstructions: string | null;
  originState: string | null;
  businessHours: unknown;
  umamiEnabled: boolean;
  featureFlags: unknown;
  venmoHandle: string | null;
  cashAppHandle: string | null;
};

export type PolicyVars = {
  businessName: string;
  email: string;
  address: string | null;
  phone: string | null;
  shipsTo: string;
  shippingRates: string;
  pickup: string;
  shipsFrom: string;
  shipsInternational: boolean;
  isZoneWeight: boolean;
  governingRegion: string;
  governingJurisdiction: string;
  umamiEnabled: boolean;
  sellsProducts: boolean;
  emailMarketing: boolean;
  backInStock: boolean;
  subscriptions: boolean;
  loyalty: boolean;
  thirdPartyEmbeds: boolean;
  donationProcessors: string;
  quickbooks: boolean;
};

export type PolicyTemplateKey = "privacy" | "terms" | "refund" | "shipping";

export type PolicyTemplate = {
  title: string;
  slug: string;
  getContent: (v: PolicyVars) => string;
};

/**
 * Trim a nullable free-text field, treating blank as absent. `??` is wrong here:
 * these columns hold `""` once an owner clears them, and an empty string must
 * fall through to the next fallback rather than win it.
 */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed.length === 0) return null;
  return trimmed;
}

export function stateName(code: string | null | undefined): string | null {
  const trimmed = blankToNull(code)?.toUpperCase();
  if (!trimmed) return null;
  return US_STATES.find((s) => s.code === trimmed)?.name ?? trimmed;
}

export function formatShipsTo(countries: SupportedCountry[]): string {
  const labels = countries.map((c) =>
    c === "US" ? "the United States" : COUNTRY_LABELS[c],
  );
  if (labels.length <= 2) return labels.join(" and ");
  const last = labels[labels.length - 1] ?? "";
  return `${labels.slice(0, -1).join(", ")}, and ${last}`;
}

export function formatShippingRates(
  business: Pick<
    PolicyBusiness,
    "shippingType" | "shippingFlatRate" | "freeShippingThreshold"
  >,
): string {
  switch (business.shippingType) {
    case "free":
      return "Shipping is free on every order.";
    case "flat_rate":
      return `Shipping is a flat rate of ${formatPrice(business.shippingFlatRate ?? 0)} per order.`;
    case "flat_rate_with_threshold":
      return `Shipping is a flat rate of ${formatPrice(
        business.shippingFlatRate ?? 0,
      )} per order, and free once your order subtotal reaches ${formatPrice(
        business.freeShippingThreshold ?? 0,
      )}.`;
    case "zone_weight":
      return "Shipping costs vary by delivery destination and package weight, calculated at checkout.";
    default:
      return "";
  }
}

export function formatHoursProse(value: unknown): string | null {
  const pairs = formatBusinessHours(parseBusinessHours(value));
  if (pairs.length === 0) return null;
  return pairs.map((p) => `${p.label} ${p.value}`).join("; ");
}

export function formatPickupSection(
  business: Pick<
    PolicyBusiness,
    | "offersInStorePickup"
    | "pickupLocation"
    | "pickupInstructions"
    | "businessAddress"
    | "businessHours"
  >,
): string {
  if (!business.offersInStorePickup) return "";
  const location =
    blankToNull(business.pickupLocation) ??
    blankToNull(business.businessAddress);
  const locationText = location ? ` at ${location}` : "";
  const hours = formatHoursProse(business.businessHours);
  const instructions = blankToNull(business.pickupInstructions);

  const extras: string[] = [];
  if (hours) extras.push(`Pickup hours: ${hours}.`);
  if (instructions) extras.push(instructions);

  const extraText = extras.length > 0 ? ` ${extras.join(" ")}` : "";

  return `## In-Store Pickup

We also offer free in-store pickup${locationText}. Look for pickup details at checkout and in your order confirmation email.${extraText}`;
}

function formatDonationProcessors(business: PolicyBusiness): string {
  const { isEnabled } = resolveFlags(business.featureFlags);
  if (!isEnabled("donations")) return "";
  const names: string[] = [];
  if (blankToNull(business.venmoHandle)) names.push("Venmo");
  if (blankToNull(business.cashAppHandle)) names.push("Cash App");
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  return names.join(" and ");
}

function formatGoverningLaw(addressState: string | null): {
  region: string;
  jurisdiction: string;
} {
  const name = stateName(addressState);
  if (!name) {
    return {
      region: "[your state/country]",
      jurisdiction: "[your jurisdiction]",
    };
  }
  return {
    region: `the State of ${name}`,
    jurisdiction: name,
  };
}

export function contactDetailsSuffix(v: PolicyVars): string {
  const parts: string[] = [];
  if (v.address) parts.push(`Our mailing address is ${v.address}.`);
  if (v.phone) parts.push(`You can also reach us by phone at ${v.phone}.`);
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

export function buildPolicyVars(business: PolicyBusiness): PolicyVars {
  const { isEnabled } = resolveFlags(business.featureFlags);
  const countries = getAllowedCountries(business.salesCountries);
  const law = formatGoverningLaw(business.addressState);
  const origin = stateName(business.originState);
  const pickup = formatPickupSection(business);
  const supportEmail =
    blankToNull(business.supportEmail) ??
    blankToNull(business.ownerEmail) ??
    "[your email]";

  return {
    businessName: business.name,
    email: supportEmail,
    address: blankToNull(business.businessAddress),
    phone: blankToNull(business.phoneNumber),
    shipsTo: formatShipsTo(countries),
    shippingRates: formatShippingRates(business),
    pickup,
    shipsFrom: origin ? `Orders ship from ${origin}.` : "",
    shipsInternational: countries.some((c) => c === "CA" || c === "MX"),
    isZoneWeight: business.shippingType === "zone_weight",
    governingRegion: law.region,
    governingJurisdiction: law.jurisdiction,
    umamiEnabled: business.umamiEnabled,
    sellsProducts: isEnabled("products"),
    emailMarketing: isEnabled("emailMarketing"),
    backInStock: isEnabled("backInStock") && isEnabled("products"),
    subscriptions: isEnabled("subscriptions") && isEnabled("products"),
    loyalty: isEnabled("loyalty"),
    thirdPartyEmbeds:
      isEnabled("embeds") || isEnabled("videos") || isEnabled("services"),
    donationProcessors: formatDonationProcessors(business),
    quickbooks: isEnabled("quickbooks"),
  };
}

function bullets(items: Array<string | false | null | undefined>): string {
  return items
    .filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    )
    .map((item) => `- ${item}`)
    .join("\n");
}

function sections(...parts: Array<string | false | null | undefined>): string {
  return parts
    .filter((part): part is string => typeof part === "string")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n");
}

function privacyMarkdown(v: PolicyVars): string {
  const collect = bullets([
    "Your name and email address",
    "Phone number (if provided)",
    "Messages and details you send through our contact form",
    v.sellsProducts && "Billing and shipping address",
    v.sellsProducts &&
      "Payment information (processed securely by our payment provider — see below)",
    v.sellsProducts && "Order details and purchase history",
    "Account login credentials (if you create an account)",
    v.backInStock &&
      "An email address if you ask us to notify you when an item is back in stock",
    v.loyalty &&
      "Rewards-program details, such as your points balance and (if you choose to share it) your birthday",
  ]);

  const use = bullets([
    v.sellsProducts &&
      "Process and fulfill your orders and send order confirmations",
    "Communicate with you about your purchases and any questions you send us",
    v.emailMarketing &&
      "Send marketing emails and promotions (only with your consent — you can opt out at any time)",
    "Improve our store",
    "Comply with legal obligations",
  ]);

  const share = bullets([
    "Our payment processor (Stripe) to complete transactions",
    v.sellsProducts && "Shipping carriers to deliver your orders",
    "The platform that hosts this store (SimplePress), as needed for technical operations",
    v.donationProcessors &&
      `${v.donationProcessors}, if you choose to donate or tip through those services`,
    v.quickbooks &&
      "QuickBooks, to create and send invoices related to your order or quote",
    v.thirdPartyEmbeds &&
      "Third-party tools we embed on the store (for example booking calendars or videos). Those providers collect information under their own policies when you interact with their content",
  ]);

  return sections(
    `${v.businessName} ("we," "our," or "this store") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and the choices you have. Your use of this store is also subject to the SimplePress Privacy Policy and Terms of Service.`,

    `## Information We Collect

When you visit, contact us, create an account, or place an order, we may collect:

${collect}`,

    `## How We Use Your Information

We use the information we collect to:

${use}`,

    `## Payment Processing

Card payments are processed securely by Stripe. We do not see, store, or have access to your full card number, CVV, or other sensitive payment credentials. Please review Stripe's privacy policy for details on how payment data is handled.`,

    v.sellsProducts
      ? `## Cookies

We use cookies and similar technologies to keep your cart active, remember your preferences, and keep you signed in. You can disable cookies in your browser settings, though some features of the store may not work correctly.`
      : `## Cookies

We use cookies and similar technologies to remember your preferences and keep you signed in. You can disable cookies in your browser settings, though some features of the store may not work correctly.`,

    v.umamiEnabled &&
      `## Analytics

This store uses the platform's privacy-friendly analytics (Umami) to understand traffic and improve the store. It does not use third-party advertising cookies. See the SimplePress Privacy Policy for more about how platform analytics work.`,

    `## How We Share Your Information

We do not sell your personal information. We share your data only with service providers that help us operate the store, including:

${share}

Service providers may only use your information to perform services on our behalf. Embedded third-party tools, if any, are governed by their own privacy policies.`,

    `## Data Retention

We retain your information for as long as your account is active or as needed to fulfill legal, tax, and accounting obligations. You may request deletion of your personal data at any time (subject to legal retention requirements).`,

    `## Security

We take reasonable precautions to protect your information, including encrypted connections (HTTPS) and access controls. No method of transmission over the internet is 100% secure, but we work to protect your data as best we can.`,

    `## Your Privacy Rights

You may request to access, correct, or delete the personal information we hold about you by contacting us at the address below. If you have a customer account, you can also download your data or request deletion from your account settings. You may opt out of marketing emails via the unsubscribe link in any email we send. Depending on where you live (for example, the EU/UK or California), you may have additional rights — [adjust this section for your region].`,

    `## Children's Privacy

Our store is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us and we will delete it promptly.`,

    `## Changes to This Policy

We may update this privacy policy from time to time. When we do, the "Last updated" date on this page will change. Continued use of our store after changes are posted constitutes your acceptance of the revised policy.`,

    `## Contact Us

If you have questions about this policy or how we handle your data, contact us at ${v.email}.${contactDetailsSuffix(v)}`,
  );
}

function termsMarkdown(v: PolicyVars): string {
  return sections(
    `Please read these Terms of Service carefully before using our store. By purchasing from us or using this website, you agree to these terms. Your use of this store is also subject to the SimplePress Terms of Service.`,

    `## Agreement to These Terms

By accessing this store or placing an order, you confirm that you are at least 18 years old (or have parental consent), that you have read and understood these terms, and that you agree to be bound by them.`,

    v.sellsProducts &&
      `## Orders & Acceptance

Your order is an offer to purchase. We reserve the right to accept, decline, or cancel any order at our discretion — for example, if an item is out of stock, if we identify an error in pricing or product information, or if we are unable to verify payment. We will notify you if your order is declined or cancelled, and any charge will be refunded.`,

    v.sellsProducts &&
      `## Pricing & Availability

Prices and product availability are subject to change without notice. If a pricing error occurs, we will contact you before processing your order. We are not obligated to honor an incorrect price.`,

    `## Payment

By completing checkout, you authorize us to charge your selected payment method for the total amount shown, including any applicable taxes and shipping fees. All card payments are processed securely through our payment provider.`,

    v.subscriptions &&
      `## Subscriptions

Some products may be offered on a recurring schedule. By subscribing, you authorize recurring charges to your payment method until you cancel. You can cancel or update your payment method from the link in your subscription emails. If we later stop offering new subscriptions, existing subscriptions keep billing until you cancel.`,

    v.sellsProducts &&
      `## Shipping & Delivery

We ship to the destinations listed in our Shipping Policy. Once your order is handed off to a carrier, risk of loss and title pass to you. We are not responsible for delays caused by carriers, customs, or circumstances outside our control. See our Shipping Policy for processing times and estimated delivery windows.`,

    `## Returns & Refunds

Our returns and refunds process is described in full in our Returns & Refunds Policy. Please review it before purchasing.`,

    v.sellsProducts &&
      `## Product Descriptions

We make every effort to accurately display products, including colors, dimensions, and materials. However, colors may appear differently depending on your screen, and minor variations in handmade or natural products are normal and not considered defects.`,

    `## Intellectual Property

All content on this store — including photos, copy, logos, and branding — is owned by ${v.businessName} or its licensors. You may not reproduce, distribute, or use any content without our written permission.`,

    `## Acceptable Use

You agree not to use this store for any unlawful purpose, to submit false or fraudulent orders, to impersonate any person, or to interfere with the operation of the store or its underlying systems.`,

    `## Disclaimer of Warranties

Products and this website are provided "as is" without warranties of any kind, express or implied. We do not warrant that the store will be uninterrupted or error-free, or that any product or service will meet your specific requirements beyond what is described on the relevant page.`,

    `## Limitation of Liability

To the maximum extent permitted by law, ${v.businessName} shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of this store or any products purchased from us. Our total liability for any claim related to an order shall not exceed the amount you paid for that order.`,

    `## Governing Law

These terms are governed by the laws of ${v.governingRegion}. Any disputes arising under these terms shall be resolved in the courts of ${v.governingJurisdiction}.`,

    `## Changes to These Terms

We may update these terms from time to time. The updated version will be posted with a revised "Last updated" date. Continued use of our store after changes are posted constitutes acceptance of the revised terms.`,

    `## Contact Us

Questions about these terms? Reach us at ${v.email}.${contactDetailsSuffix(v)}`,
  );
}

function refundMarkdown(v: PolicyVars): string {
  if (!v.sellsProducts) {
    return sections(
      `## Our Commitment

If something isn't right, contact us at ${v.email} and we'll work with you to make it right.`,

      `## Contact Us

Questions about a refund? Reach us at ${v.email} or through our contact page.${contactDetailsSuffix(v)}`,
    );
  }

  return sections(
    `## Our Commitment

Every item from ${v.businessName} is [handmade with care / carefully sourced], and we want you to love what you receive. Please read this policy before purchasing so you know exactly what to expect.`,

    `## Return Window

We accept returns within [X] days of delivery. To start a return, contact us at ${v.email} before sending anything back — we'll walk you through the process.`,

    `## Eligible Items

To be eligible for a return, items must be:

${bullets([
  "Unused and in their original condition",
  "Returned in original packaging where applicable",
  "Accompanied by your order confirmation or proof of purchase",
])}`,

    `## Non-Returnable Items

The following cannot be returned or refunded:

${bullets([
  "Custom, made-to-order, or personalized items",
  "[Any other categories specific to your shop, e.g. perishables, intimate goods]",
  "Sale or final-sale items",
])}`,

    `## Exchanges

We're happy to exchange items for a different [size / color / variation] when available. Contact us within [X] days of delivery to arrange an exchange. Customers are responsible for return shipping on exchanges.`,

    `## Damaged or Defective Items

If your order arrives damaged or defective, please contact us within [X] days with a photo of the issue. We will replace or refund the item at no cost to you.`,

    `## Refund Process

Once we receive and inspect your return:

${bullets([
  "You'll be notified whether your return is approved",
  "Approved refunds are processed within 5–10 business days",
  "Refunds are issued to your original payment method",
])}`,

    `## Return Shipping

[Who pays for return shipping? e.g., "Customers are responsible for return shipping costs unless the item arrived damaged or we made an error."]`,

    `## Contact Us

Questions about a return or refund? Reach us at ${v.email} or through our contact page.${contactDetailsSuffix(v)}`,
  );
}

function shippingMarkdown(v: PolicyVars): string {
  if (!v.sellsProducts) {
    return sections(
      `This store does not currently offer shipped product orders. If that changes, we will update this page.`,
      v.pickup,
      `## Contact Us

Shipping questions? We're happy to help — reach us at ${v.email}.${contactDetailsSuffix(v)}`,
    );
  }

  return sections(
    `Thank you for your order. This policy explains how we process and ship orders and what to do if something goes wrong.`,

    `## Processing Time

Orders are processed within [X] business days (Monday–Friday, excluding holidays). During busy seasons or sales, processing may take a bit longer — we'll keep you informed.`,

    `## Shipping Destinations

We currently ship to ${v.shipsTo}.${v.shipsFrom ? ` ${v.shipsFrom}` : ""} If your location is not listed at checkout, feel free to contact us and we'll do our best to help.`,

    `## Shipping Rates

${v.shippingRates}`,

    v.isZoneWeight &&
      `Shipping costs are calculated at checkout based on:

${bullets(["Destination", "Package weight"])}`,

    `## Order Tracking

Once your order ships, you will receive a confirmation email with your tracking number. You can use this to follow your package through the carrier's website.`,

    v.shipsInternational &&
      `## International Orders — Customs & Duties

[Buyers are responsible for any import duties, taxes, or customs fees charged by their country upon delivery. These charges are outside our control and are not included in your order total or shipping cost.]`,

    `## Lost or Delayed Packages

If your tracking shows your package has been delivered but you have not received it, please check with neighbors and your local post office first. If the package is confirmed lost, contact us within [X] days of the expected delivery date and we will work with the carrier to investigate and make it right.`,

    v.pickup,

    `## Contact Us

Shipping questions? We're happy to help — reach us at ${v.email}.${contactDetailsSuffix(v)}`,
  );
}

export const POLICY_TEMPLATES: Record<PolicyTemplateKey, PolicyTemplate> = {
  privacy: {
    title: "Privacy Policy",
    slug: "privacy-policy",
    getContent: privacyMarkdown,
  },
  terms: {
    title: "Terms of Service",
    slug: "terms-of-service",
    getContent: termsMarkdown,
  },
  refund: {
    title: "Returns & Refunds",
    slug: "refund-policy",
    getContent: refundMarkdown,
  },
  shipping: {
    title: "Shipping Policy",
    slug: "shipping-policy",
    getContent: shippingMarkdown,
  },
};

// Splits text on bracketed placeholders like "[X] days" or
// "[your jurisdiction]" and marks each bracketed span with a `code` mark, so
// leftover owner-specific placeholders render as a visually distinct
// `<code>` span instead of reading like finished copy. `code` ships in
// StarterKit, which is registered in both the editor
// (use-minimal-tiptap.ts) and the storefront renderer
// (tiptap-renderer.tsx), so the mark round-trips and actually renders
// rather than silently vanishing. There is no Highlight extension
// installed — don't reach for one.
export const splitBracketed = (
  text: string,
): Array<{ type: "text"; text: string; marks?: Array<{ type: "code" }> }> => {
  return text
    .split(/(\[[^\]]+\])/)
    .filter((part) => part.length > 0)
    .map((part) =>
      part.startsWith("[") && part.endsWith("]")
        ? {
            type: "text" as const,
            text: part,
            marks: [{ type: "code" as const }],
          }
        : { type: "text" as const, text: part },
    );
};

/** Convert the template markdown subset (headings, bullets, paragraphs) to TipTap JSON. */
export const markdownToTiptap = (markdown: string) => {
  const paragraphs = markdown.split("\n\n").filter(Boolean);

  return {
    type: "doc" as const,
    content: paragraphs.map((para) => {
      if (para.startsWith("# ")) {
        return {
          type: "heading",
          attrs: { level: 1 },
          content: splitBracketed(para.replace("# ", "")),
        };
      }
      if (para.startsWith("## ")) {
        return {
          type: "heading",
          attrs: { level: 2 },
          content: splitBracketed(para.replace("## ", "")),
        };
      }
      if (para.startsWith("### ")) {
        return {
          type: "heading",
          attrs: { level: 3 },
          content: splitBracketed(para.replace("### ", "")),
        };
      }
      if (para.startsWith("- ")) {
        const items = para.split("\n").filter((line) => line.startsWith("- "));
        return {
          type: "bulletList",
          content: items.map((item) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: splitBracketed(item.replace("- ", "")),
              },
            ],
          })),
        };
      }
      return {
        type: "paragraph",
        content: splitBracketed(para),
      };
    }),
  };
};

export function getPolicyTiptap(key: PolicyTemplateKey, vars: PolicyVars) {
  return markdownToTiptap(POLICY_TEMPLATES[key].getContent(vars));
}
