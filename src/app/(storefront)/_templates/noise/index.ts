import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { noiseAboutData, noiseAboutFieldGroups } from "./about";
import { noiseBlogData, noiseBlogFieldGroups } from "./blog";
import { noiseHomepageData, noiseHomepageFieldGroups } from "./homepage";

// ─── Contact Page ─────────────────────────────────────────────────────────────

const contactPageData: TemplateField[] = [
  {
    key: "noise.contact.header",
    label: "Contact Page Header",
    description: "Heading shown on the contact page",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
  },
  {
    key: "noise.contact.subheader",
    label: "Contact Page Subheader",
    description: "Short intro below the contact heading",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue:
      "We'd love to hear from you. Reach out about custom orders, collaborations, or just to say hello.",
  },
  {
    key: "noise.contact-image",
    label: "Contact Page Image",
    description: "Editorial image displayed alongside the contact form",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
  },
];

const contactFaqData: TemplateField[] = [
  {
    key: "noise.contact-faq-title",
    label: "FAQ Section Title",
    description: "Heading for the FAQ accordion section",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Questions & Answers",
  },
  {
    key: "noise.contact-faq-subtitle",
    label: "FAQ Section Subtitle",
    description: "Short intro text below the FAQ heading",
    type: "textarea",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Can't find what you're looking for? Send us a message.",
  },
  {
    key: "noise.contact-frequently-asked-questions",
    label: "Frequently Asked Questions",
    description: "List of Q&A pairs for the FAQ accordion",
    type: "list",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    maxItems: 10,
    itemSchema: [
      {
        key: "question",
        label: "Question",
        type: "text",
        placeholder: "e.g. Do you accept custom orders?",
      },
      {
        key: "answer",
        label: "Answer",
        type: "textarea",
        placeholder: "e.g. Yes! We love creating one-of-a-kind pieces.",
      },
    ],
  },
];

// ─── Shop Page ────────────────────────────────────────────────────────────────

const shopListingData: TemplateField[] = [
  {
    key: "noise.shop-listing-heading",
    label: "Shop Page Heading",
    description: "Heading for the shop listing page",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-1",
    defaultValue: "The Collection",
  },
  {
    key: "noise.shop-listing-intro",
    label: "Shop Page Intro",
    description: "Optional intro text below the shop heading",
    type: "textarea",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
  },
];

// ─── Global: Branding ─────────────────────────────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "noise.global.location-tag",
    label: "Location Tag",
    description:
      "Short location or brand identifier shown below your wordmark (e.g. · DETROIT ·). Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "noise.global.footer-tagline",
    label: "Footer Tagline",
    description:
      "Short brand statement shown in the footer beneath your wordmark.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Independent goods, made with care.",
  },
  {
    key: "noise.global.shop-cta-text",
    label: "Shop CTA Text",
    description:
      "Text for the main 'shop' call-to-action used in the blog post band, cart empty state, and orders empty state.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Shop the Collection",
  },
  {
    key: "noise.global.shop-cta-link",
    label: "Shop CTA Link",
    description: "URL for the main shop call-to-action.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Testimonials Page ────────────────────────────────────────────────────────

const testimonialsPageData: TemplateField[] = [
  {
    key: "noise.testimonials.page-overline",
    label: "Testimonials Page Overline",
    description: "Small caps label above the testimonials heading.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "From the people wearing it",
  },
  {
    key: "noise.testimonials.page-intro",
    label: "Testimonials Page Intro",
    description: "Short paragraph below the page heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue:
      "Unedited notes from our customers. We publish every review we receive — high and low.",
  },
  {
    key: "noise.testimonials.cta-overline",
    label: "Testimonials CTA Overline",
    description: "Small caps label above the testimonials CTA section.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Wearing something of ours?",
  },
  {
    key: "noise.testimonials.cta-heading",
    label: "Testimonials CTA Heading",
    description: "Heading for the bottom testimonials call-to-action section.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Tell us how it's holding up.",
  },
  {
    key: "noise.testimonials.cta-body",
    label: "Testimonials CTA Body",
    description: "Body text for the testimonials call-to-action section.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue:
      "We read every note that comes in. Honest feedback — the awkward kind included — is how we know what to make next.",
  },
  {
    key: "noise.testimonials.empty-state-text",
    label: "Testimonials Empty State",
    description: "Text shown when there are no testimonials yet.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "No voices yet. Check back soon.",
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "noise.global.authentication-image",
    label: "Authentication Page Image",
    description: "Image shown on sign-in/sign-up pages",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

const fieldGroups: TemplateFieldGroup[] = [
  ...noiseHomepageFieldGroups,
  ...noiseAboutFieldGroups,
  ...noiseBlogFieldGroups,
  {
    id: "global.branding",
    title: "Global Branding",
    description:
      "Location tag, footer tagline, and shop CTA used throughout the template",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact page header, subheader, and image",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ Section",
    description: "Frequently asked questions accordion",
    icon: "❓",
    columns: 1,
  },
  {
    id: "shop.listing",
    title: "Shop Page",
    description: "Heading and intro for the shop listing page",
    icon: "🏪",
    columns: 1,
  },
  {
    id: "testimonials.page",
    title: "Testimonials Page",
    description:
      "Overline, intro, CTA section, and empty state for the testimonials page",
    icon: "💬",
    columns: 2,
  },
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Image shown on sign-in and sign-up pages",
    icon: "🔑",
    columns: 1,
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const noiseData = {
  noise: [
    ...noiseHomepageData,
    ...noiseAboutData,
    ...contactPageData,
    ...contactFaqData,
    ...shopListingData,
    ...noiseBlogData,
    ...testimonialsPageData,
    ...globalBrandingData,
    ...globalAuthenticationData,
  ],
};

export const noiseFieldGroups = {
  noise: fieldGroups,
};

const _noiseFieldMap = new Map(
  noiseData.noise.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _noiseFieldMap);
}
