/**
 * Service template: service-three — Editorial
 *
 * Fields: hero image, hero video, subheading, body (richtext), secondary image,
 * pull quote + quote section media, closing CTA.
 * Designed for long-form editorial service pages.
 * Adapts to the active storefront CSS variables (no fixed palette).
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const serviceThreeFields: TemplateField[] = [
  // ── Hero ──────────────────────────────────────────────────────────────────
  {
    key: "service-three.hero-image",
    label: "Hero Image",
    description: "Full-bleed image at the top of the service page",
    type: "image",
    page: "homepage",
    group: "service-three.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "service-three.hero-video",
    label: "Hero Video",
    description:
      "Optional background video (MP4). Takes precedence over the hero image.",
    type: "video",
    page: "homepage",
    group: "service-three.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "service-three.subheading",
    label: "Subheading",
    description: "Short tagline displayed over or below the hero image",
    type: "text",
    page: "homepage",
    group: "service-three.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Crafted with intention",
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  {
    key: "service-three.body",
    label: "Body",
    description: "Main editorial body text for this service page",
    type: "richtext",
    page: "homepage",
    group: "service-three.body",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Write the detailed service description here...",
  },

  // ── Secondary image ───────────────────────────────────────────────────────
  {
    key: "service-three.secondary-image",
    label: "Secondary Image",
    description: "Additional image placed within the editorial layout",
    type: "image",
    page: "homepage",
    group: "service-three.body",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },

  // ── Pull quote ────────────────────────────────────────────────────────────
  {
    key: "service-three.quote",
    label: "Pull Quote",
    description:
      "A standout quote or statement displayed prominently on the page",
    type: "textarea",
    page: "homepage",
    group: "service-three.quote",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. The most relaxing experience I've ever had.",
  },
  {
    key: "service-three.quote-image",
    label: "Quote Section Image",
    description: "Optional image displayed alongside the pull quote",
    type: "image",
    page: "homepage",
    group: "service-three.quote",
    gridColumn: "col-span-full",
  },
  {
    key: "service-three.quote-video",
    label: "Quote Section Video",
    description:
      "Optional video displayed alongside the pull quote (MP4). Takes precedence over quote image.",
    type: "video",
    page: "homepage",
    group: "service-three.quote",
    gridColumn: "col-span-full",
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  {
    key: "service-three.cta-heading",
    label: "CTA Heading",
    description: "Optional heading above the call-to-action button",
    type: "text",
    page: "homepage",
    group: "service-three.cta",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Ready to book?",
  },
  {
    key: "service-three.cta-text",
    label: "CTA Button Text",
    description: "Label on the call-to-action button",
    type: "text",
    page: "homepage",
    group: "service-three.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "Book Now",
  },
  {
    key: "service-three.cta-link",
    label: "CTA Button Link",
    description:
      "URL the CTA button points to (leave blank to hide the button)",
    type: "url",
    page: "homepage",
    group: "service-three.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://example.com/book",
  },
  {
    key: "service-three.cta-embed",
    label: "CTA Booking Embed",
    description:
      "Optional embedded booking widget shown in the closing CTA section (e.g. Calendly, Acuity)",
    type: "iframe",
    page: "homepage",
    group: "service-three.cta",
    gridColumn: "col-span-full",
  },
];

export const serviceThreeFieldGroups: TemplateFieldGroup[] = [
  {
    id: "service-three.hero",
    title: "Hero & Subheading",
    description:
      "Banner image or video and tagline. Video takes precedence when set.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "service-three.body",
    title: "Editorial Body",
    description: "Main text and supporting image",
    icon: "📖",
    columns: 1,
  },
  {
    id: "service-three.quote",
    title: "Pull Quote",
    description:
      "A standout quote or testimonial excerpt with optional media",
    icon: "💬",
    columns: 1,
  },
  {
    id: "service-three.cta",
    title: "Call to Action",
    description:
      "Optional heading, button, and/or booking embed shown at the bottom of the page",
    icon: "👆",
    columns: 2,
  },
];

const _fieldMap = new Map(serviceThreeFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
