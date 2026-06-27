import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "builders.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown on the sign-in / sign-up pages.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "builders.global.image-overlay-color",
    label: "Image Overlay Color",
    description: "Overlay color applied on top of the authentication image.",
    type: "color",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "#131313",
  },
  {
    key: "builders.global.logo-size-width",
    label: "Logo Size Width",
    description: "Width (in pixels) of the logo on authentication pages.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
  },
  {
    key: "builders.global.logo-size-height",
    label: "Logo Size Height",
    description: "Height (in pixels) of the logo on authentication pages.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
  },
];

// ─── Global: Call to Action ───────────────────────────────────────────────────

const globalCtaData: TemplateField[] = [
  {
    key: "builders.global.cta-heading",
    label: "CTA Heading",
    description: "Large headline for the site-wide call-to-action section.",
    type: "text",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to Start Your Project?",
  },
  {
    key: "builders.global.cta-body",
    label: "CTA Body",
    description:
      "Descriptive text below the CTA heading, inviting visitors to reach out.",
    type: "textarea",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Partner with a team that treats your building's history with respect.",
  },
  {
    key: "builders.global.cta-button-label",
    label: "CTA Button Label",
    description: "Text displayed on the call-to-action button.",
    type: "text",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-1",
    defaultValue: "Contact The Cooperative",
  },
  {
    key: "builders.global.cta-button-href",
    label: "CTA Button Link",
    description: "URL the call-to-action button navigates to.",
    type: "url",
    page: "global",
    group: "global.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const buildersGlobalData: TemplateField[] = [
  ...globalAuthenticationData,
  ...globalCtaData,
];

export const buildersGlobalFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.authentication",
    title: "Authentication",
    description:
      "Image and logo settings shown on sign-in and sign-up pages.",
    icon: "🔐",
    columns: 2,
  },
  {
    id: "global.cta",
    title: "Call to Action",
    description: "Site-wide call-to-action shown on content pages",
    icon: "📣",
    columns: 2,
  },
];
