import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import {
  defaultDonateData,
  defaultDonateFieldGroups,
} from "../default/donate";
import {
  defaultEventsData,
  defaultEventsFieldGroups,
} from "../default/events";
import { defaultFaqData, defaultFaqFieldGroups } from "../default/faq";
import {
  defaultVideosData,
  defaultVideosFieldGroups,
} from "../default/videos";
import { pollenAboutData, pollenAboutFieldGroups } from "./about";
import { pollenBlogData, pollenBlogFieldGroups } from "./blog";
import {
  pollenCartData,
  pollenCartFieldGroups,
} from "./cart-checkout/cart-fields";
import {
  pollenCheckoutUnavailableData,
  pollenCheckoutUnavailableFieldGroups,
} from "./cart-checkout/checkout-unavailable-fields";
import {
  pollenOrderConfirmationData,
  pollenOrderConfirmationFieldGroups,
} from "./cart-checkout/order-fields";
import {
  pollenCollectionsData,
  pollenCollectionsFieldGroups,
} from "./collections";
import { pollenContactData, pollenContactFieldGroups } from "./contact";
import { pollenHomepageData, pollenHomepageFieldGroups } from "./homepage";
import {
  pollenProductData,
  pollenProductFieldGroups,
} from "./products";
import { pollenServicesData, pollenServicesFieldGroups } from "./services";
import { pollenShopData, pollenShopFieldGroups } from "./shop";
import {
  pollenTestimonialsData,
  pollenTestimonialsFieldGroups,
} from "./testimonials";

const globalData: TemplateField[] = [
  {
    key: "pollen.global.cta-image",
    label: "Image",
    description: "Background image for the closing banner near the bottom of most pages.",
    type: "image",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pollen.global.cta-title",
    label: "Heading",
    description: "Heading in the closing banner near the bottom of most pages.",
    type: "textarea",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to Get Started?",
    placeholder: "e.g. Ready to Get Started?",
  },
  {
    key: "pollen.global.cta-subtitle",
    label: "Small label",
    description: "Short line above the heading in the closing banner.",
    type: "text",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue: "Let's work together",
    placeholder: "Let's work together",
  },
  {
    key: "pollen.global.cta-text",
    label: "Body text",
    description: "Line under the heading in the closing banner.",
    type: "textarea",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue: "Reach out and let us know how we can help.",
    placeholder: "A short invitation to get in touch...",
  },
  {
    key: "pollen.global.cta-button-text",
    label: "Button text",
    description: "Label on the closing banner's button.",
    type: "text",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "pollen.global.cta-button-link",
    label: "Button link",
    description: "Where the closing banner's button goes.",
    type: "url",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "pollen.global.header-background",
    label: "Page hero background",
    description:
      "Background image behind the heading at the top of every page except the homepage.",
    type: "image",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pollen.global.header-button-text",
    label: "Button text",
    description:
      "Button at the right of the top menu (and in the phone menu). Leave blank to hide it; it also hides when the contact form is turned off.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "A few words",
  },
  {
    key: "pollen.global.header-button-link",
    label: "Button link",
    description:
      "Where the top-menu button goes. Leave blank to use your contact page.",
    type: "url",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

const globalAuthenticationData: TemplateField[] = [
  {
    key: "pollen.global.authentication-image",
    label: "Sign-in background image",
    description: "Image shown behind the sign-in and sign-up panel.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },

  {
    key: "pollen.global.logo-size-width",
    label: "Logo width (px)",
    description: "Width of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 24,
    max: 400,
    unit: "px",
  },
  {
    key: "pollen.global.logo-size-height",
    label: "Logo height (px)",
    description: "Height of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 24,
    max: 400,
    unit: "px",
  },
];

// The testimonials band on the services page. Its label/heading used to reuse
// the testimonials PAGE keys (`pollen.testimonials.section-*`, declared in
// `testimonials/index.ts`), which made those keys declared twice with the
// last declaration silently winning — the band now has its own global keys.
const testimonialsData: TemplateField[] = [
  {
    key: "pollen.global.testimonials-label",
    label: "Small label",
    description:
      "Short line above the testimonials heading on the services page. Leave blank to hide it.",
    type: "text",
    page: "global",
    group: "global.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "Testimonials",
    placeholder: "One or two words",
  },
  {
    key: "pollen.global.testimonials-heading",
    label: "Heading",
    description:
      "Heading above the customer quotes on the services page. Quotes come from Admin → Testimonials.",
    type: "text",
    page: "global",
    group: "global.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "Hear From Our Clients",
    placeholder: "A short heading",
  },
  {
    key: "pollen.testimonials.view-all-text",
    label: "Link text",
    description: "Text for the link below the testimonials.",
    type: "text",
    page: "global",
    group: "global.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "View all testimonials",
    placeholder: "View all testimonials",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  ...pollenHomepageFieldGroups,
  ...pollenShopFieldGroups,
  {
    id: "global.testimonials",
    title: "Testimonials band",
    description:
      "Heading and link text for the customer quotes shown on the services page. The quotes themselves come from Admin → Testimonials.",
    icon: "⭐",
    columns: 1,
  },
  {
    id: "global.cta",
    title: "Closing banner",
    description:
      "Heading, text, image, and button for the banner shown near the bottom of most pages.",
    icon: "📣",
    columns: 2,
  },
  {
    id: "global.header",
    title: "Site header",
    description:
      "Background image behind the page heading (every page but the homepage), and the button in the top menu.",
    icon: "🧭",
    columns: 2,
  },
  {
    id: "global.authentication",
    title: "Sign-in screens",
    description: "Image and logo size on the sign-in and sign-up screens.",
    icon: "🔐",
    columns: 2,
  },
  ...pollenAboutFieldGroups,
  ...pollenServicesFieldGroups,
  ...pollenContactFieldGroups,
  ...pollenCollectionsFieldGroups,
  ...pollenTestimonialsFieldGroups,
  ...pollenBlogFieldGroups,
  ...pollenProductFieldGroups,
  ...pollenCartFieldGroups,
  ...pollenCheckoutUnavailableFieldGroups,
  ...pollenOrderConfirmationFieldGroups,
  // Optional pages (events, videos, donate, FAQ) reuse Default's `default.*`
  // copy fields verbatim — pollen's pages read them through Default's
  // resolver, so declaring them here exposes them in pollen's editor.
  ...defaultEventsFieldGroups,
  ...defaultVideosFieldGroups,
  ...defaultDonateFieldGroups,
  ...defaultFaqFieldGroups,
];

export const pollenData = {
  pollen: [
    ...globalData,
    ...globalAuthenticationData,
    ...testimonialsData,
    ...pollenAboutData,
    ...pollenContactData,
    ...pollenHomepageData,
    ...pollenServicesData,
    ...pollenTestimonialsData,
    ...pollenShopData,
    ...pollenCollectionsData,
    ...pollenBlogData,
    ...pollenProductData,
    ...pollenCartData,
    ...pollenCheckoutUnavailableData,
    ...pollenOrderConfirmationData,
    ...defaultEventsData,
    ...defaultVideosData,
    ...defaultDonateData,
    ...defaultFaqData,
  ],
};

export const pollenFieldGroups = {
  pollen: fieldGroups,
};

const _pollenFieldMap = new Map(
  pollenData.pollen.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _pollenFieldMap);
}
