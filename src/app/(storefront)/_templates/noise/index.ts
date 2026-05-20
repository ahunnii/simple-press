import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { noiseHomepageData, noiseHomepageFieldGroups } from "./homepage";

// ─── About Page ───────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "noise.about-hero-heading",
    label: "About Hero Heading",
    description: "Primary heading for the about page hero section",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "Visual Noise Detroit",
  },
  {
    key: "noise.about-hero-image",
    label: "About Hero Image",
    description: "Full-bleed background image for the about page hero",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.about-hero-mission",
    label: "Mission Statement",
    description: "Short mission statement shown in the hero section",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "Haute Couture, High Fashion, Elegantly Sewn, The creation of exclusivity.",
  },
  {
    key: "noise.about-hero-vision",
    label: "Vision Statement",
    description: "Short vision statement shown alongside the mission",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "...because fashion shouldn't be quiet.",
  },
];

const aboutStoryData: TemplateField[] = [
  {
    key: "noise.about-story-heading",
    label: "Story Section Heading",
    description: "Heading for the brand story section",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "...because fashion shouldn't be quiet",
  },
  {
    key: "noise.about-story-body",
    label: "Brand Story Body",
    description: "Full brand story content (richtext)",
    type: "richtext",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.about-story-image-1",
    label: "Story Image 1",
    description: "First editorial image in the brand story section",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
  },
  {
    key: "noise.about-story-image-2",
    label: "Story Image 2",
    description: "Second editorial image in the brand story section",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
  },
];

const aboutCraftsmanshipData: TemplateField[] = [
  {
    key: "noise.about-craftsmanship-heading",
    label: "Craftsmanship Heading",
    description: "Heading for the craftsmanship/services section",
    type: "text",
    page: "about",
    group: "about.craftsmanship",
    gridColumn: "col-span-full",
    defaultValue: "Handcrafted Excellence",
  },
  {
    key: "noise.about-craftsmanship-banner",
    label: "Craftsmanship Banner Text",
    description: "Short pull quote or banner text for this section",
    type: "textarea",
    page: "about",
    group: "about.craftsmanship",
    gridColumn: "col-span-full",
    defaultValue: "Every garment is a statement. Every stitch, intentional.",
  },
  {
    key: "noise.about-craftsmanship-list",
    label: "Craftsmanship Features",
    description: "List of craftsmanship highlights (icon, title, description)",
    type: "list",
    page: "about",
    group: "about.craftsmanship",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Lucide icon name",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "e.g. Handcrafted Crochet",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "e.g. Each piece crocheted by hand with premium yarn.",
      },
    ],
  },
];

const aboutCtaData: TemplateField[] = [
  {
    key: "noise.about-cta-heading",
    label: "About CTA Heading",
    description: "Heading for the about page call-to-action section",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Wear the Noise",
  },
  {
    key: "noise.about-cta-button-text",
    label: "About CTA Button Text",
    description: "Text for the CTA button",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
  },
  {
    key: "noise.about-cta-button-link",
    label: "About CTA Button Link",
    description: "URL for the CTA button",
    type: "url",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

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

// ─── Blog Page ────────────────────────────────────────────────────────────────

const blogListingData: TemplateField[] = [
  {
    key: "noise.blog-listing-heading",
    label: "Blog Page Heading",
    description: "Heading for the blog listing page",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "Stories & Perspectives",
  },
  {
    key: "noise.blog-listing-intro",
    label: "Blog Page Intro",
    description: "Optional intro text below the blog heading",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "noise.global.authentication-image",
    label: "Authentication Page Image",
    description: "Editorial image shown on sign-in/sign-up pages",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

const fieldGroups: TemplateFieldGroup[] = [
  ...noiseHomepageFieldGroups,

  {
    id: "about.hero",
    title: "About Hero",
    description: "Hero section for the about page",
    icon: "🖼",
    columns: 2,
  },
  {
    id: "about.story",
    title: "Brand Story",
    description: "In-depth brand narrative with images",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.craftsmanship",
    title: "Craftsmanship",
    description: "Feature highlights and craft details",
    icon: "🧶",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "About CTA",
    description: "Call-to-action at the bottom of the about page",
    icon: "🛒",
    columns: 1,
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
    id: "blog.listing",
    title: "Blog Page",
    description: "Heading and intro for the blog listing page",
    icon: "✍️",
    columns: 1,
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
    ...aboutHeroData,
    ...aboutStoryData,
    ...aboutCraftsmanshipData,
    ...aboutCtaData,
    ...contactPageData,
    ...contactFaqData,
    ...shopListingData,
    ...blogListingData,
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
