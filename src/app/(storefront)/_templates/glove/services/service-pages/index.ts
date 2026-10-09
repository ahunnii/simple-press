/**
 * glove-template service detail field definitions — parity finding PF2
 * (package TP2, docs/templates/glove/parity-plan-2026-10-08.md).
 *
 * Keys are namespaced `glove-service.*` so they never collide with the
 * generic service-one/two/three templates or another storefront's variants
 * (`olive-service.*`, `bamboo-service.*`, …).
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (a service detail page has no `sections.ts` entry),
 * so `glove-service-page.tsx` carries no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls, matching olive's, bamboo's and Default's
 * variants. `page: "homepage"` is the convention every service-template
 * field set uses (it only satisfies the `TemplateField` shape; the admin
 * service editor groups by `group`).
 *
 * This module must stay free of React/server imports: `fields.ts` (and so
 * `src/lib/service-templates.ts`, which the admin UI imports) pulls it in.
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const gloveServiceFields: TemplateField[] = [
  // ── Feature (photo + intro) ──────────────────────────────────────────────
  {
    key: "glove-service.feature-image",
    label: "Photo",
    description:
      "Photo at the top of the page, under the title band, beside the intro text. Falls back to the service's own image; leave both blank to show the intro text on its own.",
    type: "image",
    page: "homepage",
    group: "glove-service.feature",
    gridColumn: "col-span-full",
  },
  {
    key: "glove-service.feature-video",
    label: "Video",
    description:
      "Optional MP4 that plays in place of the photo. Leave blank to show the photo.",
    type: "video",
    page: "homepage",
    group: "glove-service.feature",
    gridColumn: "col-span-full",
  },
  {
    key: "glove-service.intro-heading",
    label: "Heading",
    description:
      "Heading above the intro text. Only shown when the intro text below is filled in.",
    type: "text",
    page: "homepage",
    group: "glove-service.feature",
    gridColumn: "col-span-full",
    defaultValue: "What to expect",
    placeholder: "e.g. How a fitting works",
  },
  {
    key: "glove-service.intro-body",
    label: "Text",
    description:
      "Formatted introduction beside the photo. Leave blank to hide the intro and show the photo across the page instead.",
    type: "richtext",
    page: "homepage",
    group: "glove-service.feature",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe what happens at the appointment",
  },

  // ── Options (service items) ──────────────────────────────────────────────
  {
    key: "glove-service.items-heading",
    label: "Heading",
    description:
      "Heading above this service's option cards. Only shown when the service has published items.",
    type: "text",
    page: "homepage",
    group: "glove-service.items",
    gridColumn: "col-span-1",
    defaultValue: "Choose Your Appointment",
    placeholder: "e.g. Our packages",
  },
  {
    key: "glove-service.book-label",
    label: "Book button text",
    description:
      "Text on each card's booking button (it opens that item's booking page).",
    type: "text",
    page: "homepage",
    group: "glove-service.items",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Reserve",
  },

  // ── Closing banner ───────────────────────────────────────────────────────
  {
    key: "glove-service.closing-heading",
    label: "Heading",
    description:
      "Heading of the closing banner at the bottom of the page. The banner shows when it has a button or a booking widget.",
    type: "text",
    page: "homepage",
    group: "glove-service.closing",
    gridColumn: "col-span-full",
    defaultValue: "Ready to find her perfect fit?",
    placeholder: "e.g. Book your fitting",
  },
  {
    key: "glove-service.closing-body",
    label: "Text",
    description: "Short line under the closing heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "glove-service.closing",
    gridColumn: "col-span-full",
    defaultValue: "Pick a time that suits you and we'll take care of the rest.",
    placeholder: "One short sentence",
  },
  {
    key: "glove-service.closing-button-text",
    label: "Button text",
    description: "Text on the closing button. Leave the link blank to hide it.",
    type: "text",
    page: "homepage",
    group: "glove-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
    placeholder: "e.g. Book now",
  },
  {
    key: "glove-service.closing-button-link",
    label: "Button link",
    description:
      "Where the closing button goes, such as /contact or your booking page. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "glove-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "/contact",
  },
  {
    key: "glove-service.closing-embed",
    label: "Booking widget",
    description:
      "Optional embedded booking tool, such as Calendly or Acuity, shown in the closing banner. Leave blank to hide.",
    type: "iframe",
    page: "homepage",
    group: "glove-service.closing",
    gridColumn: "col-span-full",
  },
  {
    key: "glove-service.closing-embed-reveal",
    label: "Show booking widget behind a button",
    description:
      "When on, the booking widget stays hidden until the visitor clicks a button, then opens.",
    type: "boolean",
    page: "homepage",
    group: "glove-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

export const gloveServiceFieldGroups: TemplateFieldGroup[] = [
  {
    id: "glove-service.feature",
    title: "Photo and intro",
    description:
      "Photo or video under the title band, with a heading and formatted text beside it.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "glove-service.items",
    title: "Options",
    description:
      "Heading above this service's option cards and their booking button text.",
    icon: "🗓️",
    columns: 2,
  },
  {
    id: "glove-service.closing",
    title: "Closing banner",
    description:
      "Closing heading, text, button and optional booking widget at the bottom of the page.",
    icon: "💌",
    columns: 2,
  },
];

const _fieldMap = new Map(gloveServiceFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
