/**
 * Default-template service detail field definitions.
 *
 * Keys namespaced `default-service.*` to avoid collisions with the
 * generic service-one/two/three templates and with other storefront namespaces.
 *
 * Shape mirrors `_service-pages/service-one/index.ts` exactly — same
 * field slugs, same groups, same resolveFields pattern.
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const defaultServiceFields: TemplateField[] = [
  // ── Hero ──────────────────────────────────────────────────────────────────
  {
    key: "default-service.hero-image",
    label: "Image",
    description:
      "Wide image across the top of this service page. A video, if set, plays here instead.",
    type: "image",
    page: "homepage",
    group: "default-service.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "default-service.hero-video",
    label: "Video",
    description:
      "Optional MP4 that plays across the top of the page instead of the image. Leave blank to show the image.",
    type: "video",
    page: "homepage",
    group: "default-service.hero",
    gridColumn: "col-span-full",
  },

  // ── Intro ─────────────────────────────────────────────────────────────────
  {
    key: "default-service.intro-heading",
    label: "Heading",
    description:
      "Heading of the intro section below the top image. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "default-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "About This Service",
    placeholder: "e.g. How it works",
  },
  {
    key: "default-service.intro-body",
    label: "Text",
    description:
      "Formatted introduction under the heading. Leave blank to hide.",
    type: "richtext",
    page: "homepage",
    group: "default-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe what this service involves...",
  },
  {
    key: "default-service.intro-image",
    label: "Image",
    description: "Optional photo beside the intro text. Leave blank to hide.",
    type: "image",
    page: "homepage",
    group: "default-service.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "default-service.intro-video",
    label: "Video",
    description:
      "Optional MP4 beside the intro text. Plays instead of the image when set. Leave blank to hide.",
    type: "video",
    page: "homepage",
    group: "default-service.intro",
    gridColumn: "col-span-full",
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  {
    key: "default-service.cta-text",
    label: "Button text",
    description:
      "Text on the booking button, shown under the intro and at the bottom of the page once a button link is set.",
    type: "text",
    page: "homepage",
    group: "default-service.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Book a session",
  },
  {
    key: "default-service.cta-link",
    label: "Button link",
    description:
      "Where the booking button goes, such as your booking page. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "default-service.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://example.com/book",
  },
  {
    key: "default-service.cta-embed",
    label: "Booking widget",
    description:
      "Optional embedded booking tool, such as Calendly or Acuity, shown at the bottom of the page. Leave blank to hide.",
    type: "iframe",
    page: "homepage",
    group: "default-service.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "default-service.cta-embed-reveal",
    label: "Show booking widget behind a button",
    description:
      "When on, the booking widget stays hidden until the visitor clicks a button, then opens.",
    type: "boolean",
    page: "homepage",
    group: "default-service.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

export const defaultServiceFieldGroups: TemplateFieldGroup[] = [
  {
    id: "default-service.hero",
    title: "Top image",
    description:
      "Wide banner at the top of the service page. A video plays instead of the image when set.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "default-service.intro",
    title: "Intro",
    description: "Heading, text, and an optional photo or video beside them.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "default-service.cta",
    title: "Booking",
    description:
      "Optional booking button and booking widget at the bottom of the page.",
    icon: "👆",
    columns: 2,
  },
];

const _fieldMap = new Map(defaultServiceFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
