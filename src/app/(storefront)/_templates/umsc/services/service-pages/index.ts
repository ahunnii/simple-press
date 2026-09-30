/**
 * umsc-template service detail field definitions — parity finding PF24
 * (package TP7, docs/templates/umsc/parity-plan-2026-09-28.md).
 *
 * Keys are namespaced `umsc-service.*` so they never collide with the
 * generic service-one/two/three templates or another storefront's variants
 * (`noise-service.*`, `olive-service.*`, …).
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (a service detail page has no `sections.ts` entry),
 * so `umsc-service-page.tsx` carries no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls, matching noise's, olive's and Default's
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

export const umscServiceFields: TemplateField[] = [
  // ── Page header ──────────────────────────────────────────────────────────
  {
    key: "umsc-service.hero-image",
    label: "Photo",
    description:
      "Wide photo under the page heading. Falls back to the service's own image; leave both blank to show the heading alone.",
    type: "image",
    page: "homepage",
    group: "umsc-service.header",
    gridColumn: "col-span-full",
  },

  // ── Intro ────────────────────────────────────────────────────────────────
  {
    key: "umsc-service.intro-heading",
    label: "Heading",
    description:
      "Heading above the intro text. The intro only shows when it has text or a photo.",
    type: "text",
    page: "homepage",
    group: "umsc-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "What to expect",
    placeholder: "e.g. How a custom batch works",
  },
  {
    key: "umsc-service.intro-body",
    label: "Text",
    description:
      "Formatted introduction under the heading. Leave blank to hide.",
    type: "richtext",
    page: "homepage",
    group: "umsc-service.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe what the customer gets and how it works",
  },
  {
    key: "umsc-service.intro-image",
    label: "Photo",
    description: "Optional photo beside the intro text. Leave blank to hide.",
    type: "image",
    page: "homepage",
    group: "umsc-service.intro",
    gridColumn: "col-span-full",
  },

  // ── Options ──────────────────────────────────────────────────────────────
  {
    key: "umsc-service.items-heading",
    label: "Heading",
    description:
      "Heading above this service's option cards. Only shown when the service has published items.",
    type: "text",
    page: "homepage",
    group: "umsc-service.items",
    gridColumn: "col-span-1",
    defaultValue: "Choose what fits",
    placeholder: "e.g. Sizes and pricing",
  },
  {
    key: "umsc-service.book-label",
    label: "Book button text",
    description:
      "Text on each card's booking button (it opens that item's booking page).",
    type: "text",
    page: "homepage",
    group: "umsc-service.items",
    gridColumn: "col-span-1",
    defaultValue: "Book",
    placeholder: "e.g. Reserve",
  },

  // ── Closing ──────────────────────────────────────────────────────────────
  {
    key: "umsc-service.closing-heading",
    label: "Heading",
    description:
      "Heading of the closing band at the bottom of the page. The band shows when it has a button or a booking widget.",
    type: "text",
    page: "homepage",
    group: "umsc-service.closing",
    gridColumn: "col-span-full",
    defaultValue: "Questions before you book?",
    placeholder: "e.g. Plan your order",
  },
  {
    key: "umsc-service.closing-body",
    label: "Text",
    description: "Short line under the closing heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "umsc-service.closing",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell us the occasion, the count, and the date. We'll reply within two business days.",
    placeholder: "One short sentence",
  },
  {
    key: "umsc-service.closing-button-text",
    label: "Button text",
    description: "Text on the closing button. Leave the link blank to hide it.",
    type: "text",
    page: "homepage",
    group: "umsc-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "Contact us",
    placeholder: "e.g. Start a request",
  },
  {
    key: "umsc-service.closing-button-link",
    label: "Button link",
    description:
      "Where the closing button goes, such as your contact page or a booking page. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "umsc-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "umsc-service.closing-embed",
    label: "Booking widget",
    description:
      "Optional embedded booking tool, such as Calendly or Acuity, shown in the closing band. Leave blank to hide.",
    type: "iframe",
    page: "homepage",
    group: "umsc-service.closing",
    gridColumn: "col-span-full",
  },
  {
    key: "umsc-service.closing-embed-reveal",
    label: "Show booking widget behind a button",
    description:
      "When on, the booking widget stays hidden until the visitor clicks a button, then opens.",
    type: "boolean",
    page: "homepage",
    group: "umsc-service.closing",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

export const umscServiceFieldGroups: TemplateFieldGroup[] = [
  {
    id: "umsc-service.header",
    title: "Page header",
    description: "Wide photo under the service name.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "umsc-service.intro",
    title: "Intro",
    description: "Heading, text, and an optional photo beside them.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "umsc-service.items",
    title: "Option cards",
    description:
      "Heading above this service's cards and their booking button text.",
    icon: "🗓️",
    columns: 2,
  },
  {
    id: "umsc-service.closing",
    title: "Closing",
    description:
      "Closing heading, text, button and optional booking widget at the bottom of the page.",
    icon: "👆",
    columns: 2,
  },
];

const _fieldMap = new Map(umscServiceFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
