/**
 * Service template: service-two — Media-Rich
 *
 * Fields: hero video (native MP4), hero video embed (iframe fallback), gallery,
 * intro body (richtext), intro section media, highlight list, closing CTA.
 * Adapts to the active storefront CSS variables (no fixed palette).
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const serviceTwoFields: TemplateField[] = [
  // ── Hero ─────────────────────────────────────────────────────────────────
  {
    key: "service-two.hero-video-native",
    label: "Hero Video (MP4)",
    description:
      "Optional background video (MP4). Takes precedence over the hero embed below.",
    type: "video",
    page: "homepage",
    group: "service-two.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "service-two.hero-video",
    label: "Hero Video Embed",
    description:
      "Autoplay background video at the top of the service page (YouTube, Vimeo, or direct URL). Used only when no native MP4 is set.",
    type: "video",
    page: "homepage",
    group: "service-two.hero",
    gridColumn: "col-span-full",
  },

  // ── Gallery ───────────────────────────────────────────────────────────────
  {
    key: "service-two.gallery",
    label: "Photo Gallery",
    description: "Grid of images showcasing this service",
    type: "gallery",
    page: "homepage",
    group: "service-two.gallery",
    gridColumn: "col-span-full",
  },

  // ── Intro body ────────────────────────────────────────────────────────────
  {
    key: "service-two.intro-body",
    label: "Intro Body",
    description: "Rich text description of this service",
    type: "richtext",
    page: "homepage",
    group: "service-two.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe this service in detail...",
  },
  {
    key: "service-two.intro-image",
    label: "Intro Image",
    description: "Optional image displayed below the intro text",
    type: "image",
    page: "homepage",
    group: "service-two.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "service-two.intro-video",
    label: "Intro Video",
    description:
      "Optional video displayed below the intro text (MP4). Takes precedence over intro image.",
    type: "video",
    page: "homepage",
    group: "service-two.intro",
    gridColumn: "col-span-full",
  },

  // ── Highlight list ────────────────────────────────────────────────────────
  {
    key: "service-two.highlight-list",
    label: "Highlights",
    description: "Key selling points shown as icon cards",
    type: "list",
    page: "homepage",
    group: "service-two.highlights",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Lucide icon name for this highlight",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short card heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text for the card",
      },
    ],
    minItems: 0,
    maxItems: 6,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  {
    key: "service-two.cta-heading",
    label: "CTA Heading",
    description: "Optional heading above the call-to-action button",
    type: "text",
    page: "homepage",
    group: "service-two.cta",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ready to book?",
  },
  {
    key: "service-two.cta-text",
    label: "CTA Button Text",
    description: "Label on the call-to-action button",
    type: "text",
    page: "homepage",
    group: "service-two.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "Book Now",
  },
  {
    key: "service-two.cta-link",
    label: "CTA Button Link",
    description:
      "URL the CTA button points to (leave blank to hide the button)",
    type: "url",
    page: "homepage",
    group: "service-two.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://example.com/book",
  },
  {
    key: "service-two.cta-embed",
    label: "CTA Booking Embed",
    description:
      "Optional embedded booking widget shown in the closing CTA section (e.g. Calendly, Acuity)",
    type: "iframe",
    page: "homepage",
    group: "service-two.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "service-two.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open.",
    type: "boolean",
    page: "homepage",
    group: "service-two.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

export const serviceTwoFieldGroups: TemplateFieldGroup[] = [
  {
    id: "service-two.hero",
    title: "Hero Video",
    description:
      "Full-width video banner at the top of the page. Native MP4 takes precedence over embed.",
    icon: "🎬",
    columns: 1,
  },
  {
    id: "service-two.gallery",
    title: "Photo Gallery",
    description: "Curated image gallery for this service",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "service-two.intro",
    title: "Introduction",
    description:
      "Rich-text description and optional media for the intro section",
    icon: "📝",
    columns: 1,
  },
  {
    id: "service-two.highlights",
    title: "Highlights",
    description: "Icon card list of key selling points",
    icon: "✨",
    columns: 1,
  },
  {
    id: "service-two.cta",
    title: "Call to Action",
    description:
      "Optional heading, button, and/or booking embed shown at the bottom of the page",
    icon: "👆",
    columns: 2,
  },
];

const _fieldMap = new Map(serviceTwoFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
