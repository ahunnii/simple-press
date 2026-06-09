import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { pollenAboutData, pollenAboutFieldGroups } from "./about";
import { pollenBlogData, pollenBlogFieldGroups } from "./blog";
import {
  pollenCollectionsData,
  pollenCollectionsFieldGroups,
} from "./collections";
import { pollenContactData, pollenContactFieldGroups } from "./contact";
import { pollenHomepageData, pollenHomepageFieldGroups } from "./homepage";
import { pollenServicesData, pollenServicesFieldGroups } from "./services";
import { pollenShopData, pollenShopFieldGroups } from "./shop";
import {
  pollenTestimonialsData,
  pollenTestimonialsFieldGroups,
} from "./testimonials";

const globalData: TemplateField[] = [
  {
    key: "pollen.global.cta-image",
    label: "CTA Image",
    description: "Image for the CTA section",
    type: "image",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pollen.global.cta-title",
    label: "CTA Title",
    description: "Title for the CTA section",
    type: "textarea",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to Get Started?",
    placeholder: "e.g. Ready to Get Started?",
  },
  {
    key: "pollen.global.cta-subtitle",
    label: "CTA Subtitle",
    description: "Subtitle for the CTA section",
    type: "text",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue: "Let's work together",
    placeholder: "Let's work together",
  },
  {
    key: "pollen.global.cta-text",
    label: "CTA Text",
    description: "Text for the CTA section",
    type: "textarea",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue: "Reach out and let us know how we can help.",
    placeholder: "A short invitation to get in touch...",
  },
  {
    key: "pollen.global.cta-button-text",
    label: "CTA Button Text",
    description: "Button text for the CTA section",
    type: "text",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "pollen.global.cta-button-link",
    label: "CTA Button Link",
    description: "Button link for the CTA section",
    type: "url",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "pollen.global.header-background",
    label: "Header Background",
    description: "Background image for the header",
    type: "image",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const globalAuthenticationData: TemplateField[] = [
  {
    key: "pollen.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown in the authentication section",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },

  {
    key: "pollen.global.logo-size-width",
    label: "Logo Size Width",
    description: "Size of the logo in the authentication section",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
  },
  {
    key: "pollen.global.logo-size-height",
    label: "Logo Size Height",
    description: "Size of the logo in the authentication section",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
  },

  {
    key: "pollen.global.image-overlay-color",
    label: "Image Overlay Color",
    description: "Color of the image overlay in the authentication section",
    type: "color",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "#000000",
    placeholder: "#000000",
  },
];

const testimonialsData: TemplateField[] = [
  {
    key: "pollen.testimonials.section-label",
    label: "Section Label",
    description: "Small label shown above the testimonials heading",
    type: "text",
    page: "global",
    group: "global.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "Testimonials",
    placeholder: "Testimonials",
  },
  {
    key: "pollen.testimonials.section-heading",
    label: "Section Heading",
    description: "Main heading for the testimonials block",
    type: "text",
    page: "global",
    group: "global.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "Hear From Our Clients",
    placeholder: "Hear From Our Clients",
  },
  {
    key: "pollen.testimonials.view-all-text",
    label: "View All Link Text",
    description: "Text for the link below the testimonials",
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
    title: "Testimonials Section",
    description:
      "Heading and labels for the testimonials block (appears on services page)",
    icon: "⭐",
    columns: 1,
  },
  {
    id: "global.contact",
    title: "Contact",
    description:
      "Contact information for your business, displayed throughout the site",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "global.cta",
    title: "Call to Action",
    description:
      "CTA section for your business, displayed at the bottom of the page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "global.header",
    title: "Header",
    description: "Header displayed on the top of most every page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Authentication section for your business",
    icon: "🔒",
    columns: 2,
  },
  ...pollenAboutFieldGroups,
  ...pollenServicesFieldGroups,
  ...pollenContactFieldGroups,
  ...pollenCollectionsFieldGroups,
  ...pollenTestimonialsFieldGroups,
  ...pollenBlogFieldGroups,
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
