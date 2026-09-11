import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { wealthAboutData, wealthAboutFieldGroups } from "./about";
import { wealthBlogData, wealthBlogFieldGroups } from "./blog";
import { wealthContactData, wealthContactFieldGroups } from "./contact";
import { wealthDonateData, wealthDonateFieldGroups } from "./donate";
import { wealthGenericData, wealthGenericFieldGroups } from "./generic";
import { wealthHomepageData, wealthHomepageFieldGroups } from "./homepage";
import { wealthServicesData, wealthServicesFieldGroups } from "./services";
import {
  wealthTestimonialsData,
  wealthTestimonialsFieldGroups,
} from "./testimonials";
import { WEALTH_FIELD_DEFAULTS } from "./lib/resolve-fields";

// ─── Global: Branding (header nav + footer contact block) ────────────────────
// Chrome (wealth-header/footer/newsletter) reads these keys through
// `resolveWealthFields` in ./lib/resolve-fields.ts. The `defaultValue`s below
// are sourced from that file's WEALTH_FIELD_DEFAULTS record so the editor's
// default-value UI and the rendered chrome can never disagree.

const d = (key: string): string => WEALTH_FIELD_DEFAULTS[key] ?? "";

const globalBrandingData: TemplateField[] = [
  {
    key: "wealth.global.footer-address-line1",
    label: "Footer Address — Line 1",
    description: "Street address shown in the footer contact block.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.footer-address-line1"),
  },
  {
    key: "wealth.global.footer-address-line2",
    label: "Footer Address — Line 2",
    description: "City/state/ZIP line shown in the footer contact block.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.footer-address-line2"),
  },
  {
    key: "wealth.global.footer-appointment-label",
    label: "Appointment Note",
    description:
      "Italic link text below the address (links to the contact page).",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.footer-appointment-label"),
  },
  {
    key: "wealth.global.footer-email",
    label: "General Inquiries Email",
    description:
      "Email shown in the footer and used by the newsletter fallback message.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.footer-email"),
  },
  {
    key: "wealth.global.footer-ein",
    label: "EIN",
    description: "Nonprofit EIN line in the footer. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.footer-ein"),
  },
  {
    key: "wealth.global.nav-resources-url",
    label: "Resources Link",
    description:
      "Where the menu's Resources link points (a page you create, e.g. /resources).",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.nav-resources-url"),
  },
  {
    key: "wealth.global.footer-farm-logo",
    label: "Partner Logo",
    description:
      "Partner logo shown at the bottom of the footer (Oakland Avenue Urban Farm on the original site). Clear it to hide.",
    type: "image",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-full",
    defaultValue: d("wealth.global.footer-farm-logo"),
  },
  {
    key: "wealth.global.footer-farm-url",
    label: "Partner Link",
    description: "Where the partner logo links.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.footer-farm-url"),
  },
  {
    key: "wealth.global.footer-farm-alt",
    label: "Partner Logo Alt Text",
    description: "Describes the partner logo for screen readers.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.footer-farm-alt"),
  },
];

// ─── Global: Newsletter (footer Subscribe block) ─────────────────────────────

const globalNewsletterData: TemplateField[] = [
  {
    key: "wealth.global.newsletter-heading",
    label: "Newsletter Heading",
    description: "Italic heading on the footer Subscribe block.",
    type: "text",
    page: "global",
    group: "global.newsletter",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.newsletter-heading"),
  },
  {
    key: "wealth.global.newsletter-body",
    label: "Newsletter Body",
    description: "Line under the Subscribe heading.",
    type: "textarea",
    page: "global",
    group: "global.newsletter",
    gridColumn: "col-span-full",
    defaultValue: d("wealth.global.newsletter-body"),
  },
  {
    key: "wealth.global.newsletter-privacy",
    label: "Privacy Note",
    description: "Small line under the sign-up button.",
    type: "text",
    page: "global",
    group: "global.newsletter",
    gridColumn: "col-span-1",
    defaultValue: d("wealth.global.newsletter-privacy"),
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const wealthData = {
  wealth: [
    ...wealthHomepageData,
    ...wealthAboutData,
    ...wealthContactData,
    ...wealthTestimonialsData,
    ...wealthServicesData,
    ...wealthDonateData,
    ...wealthBlogData,
    ...wealthGenericData,
    ...globalBrandingData,
    ...globalNewsletterData,
  ],
};

export const wealthFieldGroups = {
  wealth: [
    ...wealthHomepageFieldGroups,
    ...wealthAboutFieldGroups,
    ...wealthContactFieldGroups,
    ...wealthTestimonialsFieldGroups,
    ...wealthServicesFieldGroups,
    ...wealthDonateFieldGroups,
    ...wealthBlogFieldGroups,
    ...wealthGenericFieldGroups,
    {
      id: "global.branding",
      title: "Footer & Navigation",
      description:
        "Footer contact block (address, email, EIN), partner logo, and the menu's Resources link",
      icon: "🏷️",
      columns: 2,
    } satisfies TemplateFieldGroup,
    {
      id: "global.newsletter",
      title: "Footer Newsletter",
      description: "The footer Subscribe block's heading, body, and privacy note",
      icon: "✉️",
      columns: 2,
    } satisfies TemplateFieldGroup,
  ],
};

const _wealthFieldMap = new Map(
  wealthData.wealth.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _wealthFieldMap);
}
