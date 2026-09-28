/**
 * olive-template service detail field definitions — parity finding PF11
 * (package TP5, docs/templates/olive/parity-plan-2026-09-28.md).
 *
 * Keys are namespaced `olive-service.*` so they never collide with the
 * generic service-one/two/three templates or another storefront's variants
 * (`bamboo-service.*`, `default-service.*`, …).
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (a service detail page has no `sections.ts` entry),
 * so `olive-service-page.tsx` carries no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls, matching `bamboo-service-page.tsx` and
 * `default-service-page.tsx`. `page: "homepage"` is the convention every
 * service-template field set uses (it only satisfies the `TemplateField`
 * shape; the admin service editor groups by `group`).
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const oliveServiceFields: TemplateField[] = [
  // ── Page header ──────────────────────────────────────────────────────────
  {
    key: "olive-service.hero-image",
    label: "Photo",
    description:
      "Photo across the top of the page, with the service name on a card over it. Falls back to the service's own image; leave both blank for a plain title band.",
    type: "image",
    page: "homepage",
    group: "olive-service.header",
    gridColumn: "col-span-full",
  },
  {
    key: "olive-service.hero-video",
    label: "Video",
    description:
      "Optional MP4 that plays across the top of the page instead of the photo. Leave blank to show the photo.",
    type: "video",
    page: "homepage",
    group: "olive-service.header",
    gridColumn: "col-span-full",
  },

  // ── Intro ────────────────────────────────────────────────────────────────
  {
    key: "olive-service.intro-heading",
    label: "Heading",
    description:
      "Heading above the intro text. The intro section only shows when it has text, a photo or a video.",
    type: "text",
    page: "homepage",
    group: "olive-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "What to expect",
    placeholder: "e.g. How a fitting works",
  },
  {
    key: "olive-service.intro-body",
    label: "Text",
    description:
      "Formatted introduction under the heading. Leave blank to hide.",
    type: "richtext",
    page: "homepage",
    group: "olive-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe what happens at the appointment",
  },
  {
    key: "olive-service.intro-image",
    label: "Photo",
    description: "Optional photo beside the intro text. Leave blank to hide.",
    type: "image",
    page: "homepage",
    group: "olive-service.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "olive-service.intro-video",
    label: "Video",
    description:
      "Optional MP4 beside the intro text. Plays instead of the photo when set. Leave blank to hide.",
    type: "video",
    page: "homepage",
    group: "olive-service.intro",
    gridColumn: "col-span-full",
  },

  // ── Items ────────────────────────────────────────────────────────────────
  {
    key: "olive-service.items-heading",
    label: "Heading",
    description:
      "Heading above this service's appointment cards. Only shown when the service has published items.",
    type: "text",
    page: "homepage",
    group: "olive-service.items",
    gridColumn: "col-span-1",
    defaultValue: "Choose your appointment",
    placeholder: "e.g. Our appointments",
  },
  {
    key: "olive-service.book-label",
    label: "Book button text",
    description:
      "Text on each card's booking button (it opens that item's booking page).",
    type: "text",
    page: "homepage",
    group: "olive-service.items",
    gridColumn: "col-span-1",
    defaultValue: "Book",
    placeholder: "e.g. Reserve",
  },

  // ── Closing ──────────────────────────────────────────────────────────────
  {
    key: "olive-service.closing-heading",
    label: "Heading",
    description:
      "Heading of the closing band at the bottom of the page. The band shows when it has a button or a booking widget.",
    type: "text",
    page: "homepage",
    group: "olive-service.closing",
    gridColumn: "col-span-full",
    defaultValue: "Ready when you are.",
    placeholder: "e.g. Book your fitting",
  },
  {
    key: "olive-service.closing-body",
    label: "Text",
    description: "Short line under the closing heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "olive-service.closing",
    gridColumn: "col-span-full",
    defaultValue: "Pick a time that suits you and we'll have the room ready.",
    placeholder: "One short sentence",
  },
  {
    key: "olive-service.closing-button-text",
    label: "Button text",
    description: "Text on the closing button. Leave the link blank to hide it.",
    type: "text",
    page: "homepage",
    group: "olive-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "Book a visit",
    placeholder: "e.g. Book now",
  },
  {
    key: "olive-service.closing-button-link",
    label: "Button link",
    description:
      "Where the closing button goes, such as your booking page. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "olive-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://example.com/book",
  },
  {
    key: "olive-service.closing-embed",
    label: "Booking widget",
    description:
      "Optional embedded booking tool, such as Calendly or Acuity, shown in the closing band. Leave blank to hide.",
    type: "iframe",
    page: "homepage",
    group: "olive-service.closing",
    gridColumn: "col-span-full",
  },
  {
    key: "olive-service.closing-embed-reveal",
    label: "Show booking widget behind a button",
    description:
      "When on, the booking widget stays hidden until the visitor clicks a button, then opens.",
    type: "boolean",
    page: "homepage",
    group: "olive-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

export const oliveServiceFieldGroups: TemplateFieldGroup[] = [
  {
    id: "olive-service.header",
    title: "Page header",
    description:
      "Photo or video across the top of the page, behind the service name.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "olive-service.intro",
    title: "Intro",
    description: "Heading, text, and an optional photo or video beside them.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "olive-service.items",
    title: "Appointments",
    description:
      "Heading above this service's cards and their booking button text.",
    icon: "🗓️",
    columns: 2,
  },
  {
    id: "olive-service.closing",
    title: "Closing",
    description:
      "Closing heading, text, booking button and optional booking widget at the bottom of the page.",
    icon: "👆",
    columns: 2,
  },
];

const _fieldMap = new Map(oliveServiceFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
