/**
 * Service template: service-one — Clean / Minimal
 *
 * Fields: intro heading, intro body (richtext), hero image, hero video,
 * intro section media, CTA text + link + embed.
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
  {
    key: "service-one.hero-video",
    label: "Hero Video",
    description:
      "Optional background video (MP4). Takes precedence over the hero image.",
    type: "video",
    page: "homepage",
    group: "service-one.hero",
    gridColumn: "col-span-full",
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
  {
    key: "service-one.intro-image",
    label: "Intro Image",
    description: "Optional image displayed beside the intro text",
    type: "image",
    page: "homepage",
    group: "service-one.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "service-one.intro-video",
    label: "Intro Video",
    description:
      "Optional video displayed beside the intro text (MP4). Takes precedence over intro image.",
    type: "video",
    page: "homepage",
    group: "service-one.intro",
    gridColumn: "col-span-full",
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
    description:
      "URL the CTA button points to (leave blank to hide the button)",
    type: "url",
    page: "homepage",
    group: "service-one.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://example.com/book",
  },
  {
    key: "service-one.cta-embed",
    label: "CTA Booking Embed",
    description:
      "Optional embedded booking widget shown in the closing CTA section (e.g. Calendly, Acuity)",
    type: "iframe",
    page: "homepage",
    group: "service-one.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "service-one.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open.",
    type: "boolean",
    page: "homepage",
    group: "service-one.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

export const serviceOneFieldGroups: TemplateFieldGroup[] = [
  {
    id: "service-one.hero",
    title: "Hero Image & Video",
    description:
      "Large banner at the top of the service page. Video takes precedence when set.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "service-one.intro",
    title: "Introduction",
    description:
      "Heading, rich-text body, and optional media for the intro section",
    icon: "📝",
    columns: 1,
  },
  {
    id: "service-one.cta",
    title: "Call to Action",
    description:
      "Optional button and/or booking embed shown at the bottom of the page",
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
