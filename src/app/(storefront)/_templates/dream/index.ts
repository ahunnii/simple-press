import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { dreamAboutData, dreamAboutFieldGroups } from "./about";
import { dreamContactData, dreamContactFieldGroups } from "./contact";
import { dreamHomepageData, dreamHomepageFieldGroups } from "./homepage";
import { DREAM_FIELD_DEFAULTS } from "./lib/resolve-fields";
import { dreamServicesData, dreamServicesFieldGroups } from "./services";
import {
  dreamTestimonialsData,
  dreamTestimonialsFieldGroups,
} from "./testimonials";

// ─── Global: Branding (topbar + header CTA + footer) ─────────────────────────
// Chrome (dream-topbar/header/footer) reads these keys through
// `resolveDreamFields` in ./lib/resolve-fields.ts. The `defaultValue`s below
// are sourced from that file's DREAM_FIELD_DEFAULTS record so the editor's
// default-value UI and the rendered chrome can never disagree.

const d = (key: string): string => DREAM_FIELD_DEFAULTS[key] ?? "";

const globalBrandingData: TemplateField[] = [
  {
    key: "dream.global.announcement-text",
    label: "Announcement Text",
    description:
      "Topbar announcement above the header, shown on every page. Leave blank to hide the topbar.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-full",
    defaultValue: d("dream.global.announcement-text"),
  },
  {
    key: "dream.global.announcement-link-label",
    label: "Announcement Link Label",
    description:
      "Label for an optional link at the end of the topbar. Leave blank to hide the link.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.announcement-link-label"),
  },
  {
    key: "dream.global.announcement-url",
    label: "Announcement Link URL",
    description: "Where the topbar's optional link points to.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.announcement-url"),
  },
  {
    key: "dream.global.header-cta-label",
    label: "Header CTA Label",
    description:
      'Label for the outlined pill in the header and mobile menu (e.g. "Estimate Quote").',
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.header-cta-label"),
  },
  {
    key: "dream.global.header-cta-url",
    label: "Header CTA Link",
    description: "Where the header CTA pill links to.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.header-cta-url"),
  },
  {
    key: "dream.global.footer-signoff",
    label: "Footer Sign-off",
    description:
      "Short line in the footer's brand column, before the script accent word.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.footer-signoff"),
  },
  {
    key: "dream.global.footer-signoff-accent",
    label: "Footer Sign-off Accent Word",
    description:
      'Script-styled rest of the sign-off line (e.g. "a theme."). Leave blank to hide.',
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.footer-signoff-accent"),
  },
  {
    key: "dream.global.service-area",
    label: "Service Area",
    description: "Short line describing where the business serves clients.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.service-area"),
  },
  {
    key: "dream.global.footer-tagline",
    label: "Footer Tagline",
    description:
      "Optional supplementary line in the footer's brand column. Leave blank to hide.",
    type: "textarea",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-full",
    defaultValue: d("dream.global.footer-tagline"),
  },
  {
    key: "dream.global.contact-email",
    label: "Contact Email",
    description: "Shown in the footer contact column. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.contact-email"),
  },
  {
    key: "dream.global.contact-phone",
    label: "Contact Phone",
    description: "Shown in the footer contact column. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.contact-phone"),
  },
  {
    key: "dream.global.contact-hours",
    label: "Contact Hours",
    description: "Shown in the footer contact column. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.contact-hours"),
  },
];

// ─── Global: Authentication (sign-in / sign-up screens, Default fallback) ────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "dream.global.authentication-image",
    label: "Authentication Image",
    description: "Image shown behind the sign-in and sign-up panel.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: d("dream.global.authentication-image"),
  },
  {
    key: "dream.global.logo-size-width",
    label: "Logo Size Width",
    description:
      "Width of the logo on the sign-in and sign-up screens (pixels).",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.logo-size-width"),
    placeholder: "80",
  },
  {
    key: "dream.global.logo-size-height",
    label: "Logo Size Height",
    description:
      "Height of the logo on the sign-in and sign-up screens (pixels).",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: d("dream.global.logo-size-height"),
    placeholder: "80",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const dreamData = {
  dream: [
    ...dreamHomepageData,
    ...dreamAboutData,
    ...dreamServicesData,
    ...dreamContactData,
    ...dreamTestimonialsData,
    ...globalBrandingData,
    ...globalAuthenticationData,
  ],
};

export const dreamFieldGroups = {
  dream: [
    ...dreamHomepageFieldGroups,
    ...dreamAboutFieldGroups,
    ...dreamServicesFieldGroups,
    ...dreamContactFieldGroups,
    ...dreamTestimonialsFieldGroups,
    {
      id: "global.branding",
      title: "Topbar, Navigation & Footer",
      description:
        "Announcement bar, header CTA, and the footer's brand/contact copy — shown on every page. Nav links are managed in Content → Navigation; social links in Content → Branding.",
      icon: "🏷️",
      columns: 2,
    } satisfies TemplateFieldGroup,
    {
      id: "global.authentication",
      title: "Authentication",
      description: "Image and logo size on the sign-in and sign-up screens.",
      icon: "🔐",
      columns: 2,
    } satisfies TemplateFieldGroup,
  ],
};

const _dreamFieldMap = new Map(
  dreamData.dream.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _dreamFieldMap);
}
