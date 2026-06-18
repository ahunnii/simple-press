/**
 * Service template: service-one — Clean / Minimal
 *
 * Fields: intro heading, intro body (richtext), hero image, CTA text + link.
 * Adapts to the active storefront CSS variables (no fixed palette).
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const serviceOneFields: TemplateField[] = [
  // ── Hero ──────────────────────────────────────────────────────────────────
  {
    key: "service-one.hero-image",
    label: "Hero Image",
    description: "Full-width image displayed at the top of the service page",
    type: "image",
    page: "homepage",
    group: "service-one.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },

  // ── Intro ─────────────────────────────────────────────────────────────────
  {
    key: "service-one.intro-heading",
    label: "Intro Heading",
    description: "Primary heading below the hero image",
    type: "text",
    page: "homepage",
    group: "service-one.intro",
    gridColumn: "col-span-full",
    defaultValue: "About This Service",
    placeholder: "e.g. About This Service",
  },
  {
    key: "service-one.intro-body",
    label: "Intro Body",
    description: "Rich text introduction for this service group",
    type: "richtext",
    page: "homepage",
    group: "service-one.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe what this service involves...",
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  {
    key: "service-one.cta-text",
    label: "CTA Button Text",
    description: "Label on the call-to-action button",
    type: "text",
    page: "homepage",
    group: "service-one.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "Book Now",
  },
  {
    key: "service-one.cta-link",
    label: "CTA Button Link",
    description: "URL the CTA button points to (leave blank to hide the button)",
    type: "url",
    page: "homepage",
    group: "service-one.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://example.com/book",
  },
];

export const serviceOneFieldGroups: TemplateFieldGroup[] = [
  {
    id: "service-one.hero",
    title: "Hero Image",
    description: "Large banner image at the top of the service page",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "service-one.intro",
    title: "Introduction",
    description: "Heading and rich-text body describing this service",
    icon: "📝",
    columns: 1,
  },
  {
    id: "service-one.cta",
    title: "Call to Action",
    description: "Optional button linking visitors to a booking page",
    icon: "👆",
    columns: 2,
  },
];

const _fieldMap = new Map(serviceOneFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
