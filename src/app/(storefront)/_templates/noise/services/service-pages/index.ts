/**
 * noise-template service detail field definitions — parity finding PF13
 * (package TP5, docs/templates/noise/parity-plan-2026-09-28.md).
 *
 * Keys are namespaced `noise-service.*` so they never collide with the
 * generic service-one/two/three templates or another storefront's variants
 * (`olive-service.*`, `bamboo-service.*`, …).
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (a service detail page has no `sections.ts` entry),
 * so `noise-service-page.tsx` carries no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls, matching olive's, bamboo's and Default's
 * variants. `page: "homepage"` is the convention every service-template
 * field set uses (it only satisfies the `TemplateField` shape; the admin
 * service editor groups by `group`).
 *
 * This module is imported by `src/lib/service-templates.ts` (via
 * `./fields`), which the admin UI loads — keep it free of React/server
 * imports.
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const noiseServiceFields: TemplateField[] = [
  // ── Page header ──────────────────────────────────────────────────────────
  {
    key: "noise-service.hero-image",
    label: "Photo",
    description:
      "Wide photo under the service name. Falls back to the service's own image; leave both blank to show the title band alone.",
    type: "image",
    page: "homepage",
    group: "noise-service.header",
    gridColumn: "col-span-full",
  },
  {
    key: "noise-service.hero-video",
    label: "Video",
    description:
      "Optional MP4 that plays under the service name instead of the photo. Leave blank to show the photo.",
    type: "video",
    page: "homepage",
    group: "noise-service.header",
    gridColumn: "col-span-full",
  },

  // ── Intro ────────────────────────────────────────────────────────────────
  {
    key: "noise-service.intro-heading",
    label: "Heading",
    description:
      "Heading above the intro text. The intro section only shows when it has text, a photo or a video.",
    type: "text",
    page: "homepage",
    group: "noise-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "What to expect",
    placeholder: "e.g. How a fitting works",
  },
  {
    key: "noise-service.intro-body",
    label: "Text",
    description:
      "Formatted introduction under the heading. Leave blank to hide.",
    type: "richtext",
    page: "homepage",
    group: "noise-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe what happens at the appointment",
  },
  {
    key: "noise-service.intro-image",
    label: "Photo",
    description: "Optional photo beside the intro text. Leave blank to hide.",
    type: "image",
    page: "homepage",
    group: "noise-service.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "noise-service.intro-video",
    label: "Video",
    description:
      "Optional MP4 beside the intro text. Plays instead of the photo when set. Leave blank to hide.",
    type: "video",
    page: "homepage",
    group: "noise-service.intro",
    gridColumn: "col-span-full",
  },

  // ── Items ────────────────────────────────────────────────────────────────
  {
    key: "noise-service.items-heading",
    label: "Heading",
    description:
      "Heading above this service's booking cards. Only shown when the service has published items.",
    type: "text",
    page: "homepage",
    group: "noise-service.items",
    gridColumn: "col-span-1",
    defaultValue: "Pick your slot",
    placeholder: "e.g. Our appointments",
  },
  {
    key: "noise-service.book-label",
    label: "Book button text",
    description:
      "Text on each card's booking button (it opens that item's booking page).",
    type: "text",
    page: "homepage",
    group: "noise-service.items",
    gridColumn: "col-span-1",
    defaultValue: "Book",
    placeholder: "e.g. Reserve",
  },

  // ── Closing ──────────────────────────────────────────────────────────────
  {
    key: "noise-service.closing-heading",
    label: "Heading",
    description:
      "Heading of the closing band at the bottom of the page. The band shows when it has a button or a booking widget.",
    type: "text",
    page: "homepage",
    group: "noise-service.closing",
    gridColumn: "col-span-full",
    defaultValue: "Ready when you are.",
    placeholder: "e.g. Book your fitting",
  },
  {
    key: "noise-service.closing-body",
    label: "Text",
    description: "Short line under the closing heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "noise-service.closing",
    gridColumn: "col-span-full",
    defaultValue: "Pick a time that works and we'll take it from there.",
    placeholder: "One short sentence",
  },
  {
    key: "noise-service.closing-button-text",
    label: "Button text",
    description: "Text on the closing button. Leave the link blank to hide it.",
    type: "text",
    page: "homepage",
    group: "noise-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "Book a visit",
    placeholder: "e.g. Book now",
  },
  {
    key: "noise-service.closing-button-link",
    label: "Button link",
    description:
      "Where the closing button goes, such as your booking page. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "noise-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://example.com/book",
  },
  {
    key: "noise-service.closing-embed",
    label: "Booking widget",
    description:
      "Optional embedded booking tool, such as Calendly or Acuity, shown in the closing band. Leave blank to hide.",
    type: "iframe",
    page: "homepage",
    group: "noise-service.closing",
    gridColumn: "col-span-full",
  },
  {
    key: "noise-service.closing-embed-reveal",
    label: "Show booking widget behind a button",
    description:
      "When on, the booking widget stays hidden until the visitor clicks a button, then opens.",
    type: "boolean",
    page: "homepage",
    group: "noise-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

export const noiseServiceFieldGroups: TemplateFieldGroup[] = [
  {
    id: "noise-service.header",
    title: "Page header",
    description: "Wide photo or video under the service name.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "noise-service.intro",
    title: "Intro",
    description: "Heading, text, and an optional photo or video beside them.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "noise-service.items",
    title: "Booking cards",
    description:
      "Heading above this service's cards and their booking button text.",
    icon: "🗓️",
    columns: 2,
  },
  {
    id: "noise-service.closing",
    title: "Closing",
    description:
      "Closing heading, text, booking button and optional booking widget at the bottom of the page.",
    icon: "👆",
    columns: 2,
  },
];

const _fieldMap = new Map(noiseServiceFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
