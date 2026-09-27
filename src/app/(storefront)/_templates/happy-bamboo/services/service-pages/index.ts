/**
 * happy-bamboo-template service detail field definitions.
 *
 * Keys namespaced `happy-bamboo-service.*` to avoid collisions with the
 * generic service-one/two/three templates and with other storefront
 * namespaces (matches `default-service.*`, `dream-lane.*`, etc.).
 *
 * Field set mirrors `default/services/service-pages/index.ts` (hero,
 * intro, closing CTA + booking embed) restyled for the happy-bamboo page
 * shelf, plus a `small-label` badge field and standalone `items-heading` /
 * `closing-heading` / `closing-body` fields for the bamboo section language.
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (there is no `sections.ts` entry for a service
 * detail page), so `happy-bamboo-service-page.tsx` has no
 * `sectionGroupAttr`/`fieldAttr`/`isSectionVisible` calls, matching
 * `default-service-page.tsx`, dream's per-service pages, etc.
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const happyBambooServiceFields: TemplateField[] = [
  // ── Header shelf ─────────────────────────────────────────────────────────
  {
    key: "happy-bamboo-service.small-label",
    label: "Small label",
    description:
      "Short badge shown above the service name in the page header. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "happy-bamboo-service.header",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Signature Service",
  },
  {
    key: "happy-bamboo-service.hero-image",
    label: "Image",
    description:
      "Photo shown beside the service name in the page header. Falls back to the service's own image, if set. A video, if set, plays here instead. Leave both blank to hide this side entirely.",
    type: "image",
    page: "homepage",
    group: "happy-bamboo-service.header",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo-service.hero-video",
    label: "Video",
    description:
      "Optional MP4 that plays beside the service name instead of the image. Leave blank to show the image.",
    type: "video",
    page: "homepage",
    group: "happy-bamboo-service.header",
    gridColumn: "col-span-full",
  },

  // ── Intro ─────────────────────────────────────────────────────────────────
  {
    key: "happy-bamboo-service.intro-heading",
    label: "Heading",
    description:
      "Heading of the intro section below the header. Leave blank to hide the whole intro section.",
    type: "text",
    page: "homepage",
    group: "happy-bamboo-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "About This Service",
    placeholder: "e.g. How it works",
  },
  {
    key: "happy-bamboo-service.intro-body",
    label: "Text",
    description:
      "Formatted introduction under the heading. Leave blank to hide.",
    type: "richtext",
    page: "homepage",
    group: "happy-bamboo-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe what this service involves...",
  },
  {
    key: "happy-bamboo-service.intro-image",
    label: "Image",
    description: "Optional photo beside the intro text. Leave blank to hide.",
    type: "image",
    page: "homepage",
    group: "happy-bamboo-service.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo-service.intro-video",
    label: "Video",
    description:
      "Optional MP4 beside the intro text. Plays instead of the image when set. Leave blank to hide.",
    type: "video",
    page: "homepage",
    group: "happy-bamboo-service.intro",
    gridColumn: "col-span-full",
  },

  // ── Items ─────────────────────────────────────────────────────────────────
  {
    key: "happy-bamboo-service.items-heading",
    label: "Heading",
    description:
      "Heading above the grid built from this service's items. Only shown when the service has published items.",
    type: "text",
    page: "homepage",
    group: "happy-bamboo-service.items",
    gridColumn: "col-span-full",
    defaultValue: "Our Services",
  },

  // ── Closing ───────────────────────────────────────────────────────────────
  {
    key: "happy-bamboo-service.closing-heading",
    label: "Heading",
    description: "Heading for the closing section at the bottom of the page.",
    type: "text",
    page: "homepage",
    group: "happy-bamboo-service.closing",
    gridColumn: "col-span-full",
    defaultValue: "Ready to Book?",
  },
  {
    key: "happy-bamboo-service.closing-body",
    label: "Text",
    description: "Short line under the closing heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "happy-bamboo-service.closing",
    gridColumn: "col-span-full",
    defaultValue: "Reach out and we'll take care of the rest.",
  },
  {
    key: "happy-bamboo-service.closing-button-text",
    label: "Button text",
    description: "Text on the closing button. Leave the link blank to hide.",
    type: "text",
    page: "homepage",
    group: "happy-bamboo-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Book a session",
  },
  {
    key: "happy-bamboo-service.closing-button-link",
    label: "Button link",
    description:
      "Where the closing button goes, such as your booking page. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "happy-bamboo-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://example.com/book",
  },
  {
    key: "happy-bamboo-service.closing-embed",
    label: "Booking widget",
    description:
      "Optional embedded booking tool, such as Calendly or Acuity, shown at the bottom of the page. Leave blank to hide.",
    type: "iframe",
    page: "homepage",
    group: "happy-bamboo-service.closing",
    gridColumn: "col-span-full",
  },
  {
    key: "happy-bamboo-service.closing-embed-reveal",
    label: "Show booking widget behind a button",
    description:
      "When on, the booking widget stays hidden until the visitor clicks a button, then opens.",
    type: "boolean",
    page: "homepage",
    group: "happy-bamboo-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

export const happyBambooServiceFieldGroups: TemplateFieldGroup[] = [
  {
    id: "happy-bamboo-service.header",
    title: "Page header",
    description:
      "Small badge and photo or video shown beside the service name at the top of the page.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "happy-bamboo-service.intro",
    title: "Intro",
    description: "Heading, text, and an optional photo or video beside them.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "happy-bamboo-service.items",
    title: "Items",
    description: "Heading above the grid built from this service's items.",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "happy-bamboo-service.closing",
    title: "Closing",
    description:
      "Closing heading, text, booking button, and optional booking widget at the bottom of the page.",
    icon: "👆",
    columns: 2,
  },
];

const _fieldMap = new Map(happyBambooServiceFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
