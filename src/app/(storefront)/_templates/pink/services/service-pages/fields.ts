/**
 * `pink-table` service-detail template field definitions.
 *
 * One def, id `pink-table` — the only per-service detail template the
 * `pink` build ships (design.md → "Service detail — pink-table"). Fields
 * live on `Service.customFields` (edited at `/admin/services/[id]`, NOT the
 * visual editor — service detail pages have no `sections.ts` entries).
 *
 * Field key convention: "pink-table.<field-slug>". `page: "homepage"`
 * follows the established convention for per-service-template fields (see
 * builders-craft / vii-atelier) — the admin service editor groups fields by
 * `group`, not `page`; the literal value is otherwise unused here.
 */
import type { ServiceTemplateDef } from "~/lib/service-templates";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

// ─── Built-in list defaults ─────────────────────────────────────────────────
// Text copied verbatim from the pre-migration `DEFAULT_FACT_ROWS` constant in
// `pink-table-service-page.tsx`.

const PINK_TABLE_FACT_ROWS_DEFAULT_ROWS = [
  {
    label: "Where",
    value: "Your space — school, church, library or workplace",
  },
  { label: "Group size", value: "10 to 12 at a table" },
  { label: "Materials", value: "Everything included" },
  { label: "Notice", value: "Book at least 2 weeks out" },
] satisfies Record<string, string>[];

export const pinkTableFields: TemplateField[] = [
  // ── pink-table.hero ────────────────────────────────────────────────────
  {
    key: "pink-table.duration-label",
    label: "Duration",
    description:
      "Shown near the top of the hero alongside the group size. Ships blank on purpose — fill it in only once you know how long a session actually runs.",
    type: "text",
    page: "homepage",
    group: "pink-table.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "90 minutes",
  },
  {
    key: "pink-table.group-size-label",
    label: "Group size",
    description: "Shown near the top of the hero alongside the duration.",
    type: "text",
    page: "homepage",
    group: "pink-table.hero",
    gridColumn: "col-span-1",
    defaultValue: "10 to 12 people",
    placeholder: "10 to 12 people",
  },
  {
    key: "pink-table.hero-intro",
    label: "Intro text",
    description: "One or two sentences under the service name in the hero.",
    type: "textarea",
    page: "homepage",
    group: "pink-table.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "A hands-on make & take brought to your room — sewing, stuffing and finishing a small piece by hand. No experience needed.",
  },
  {
    key: "pink-table.fact-rows",
    label: "Fact rows",
    description:
      "Up to four label/value rows shown at the bottom of the hero. Falls back to built-in rows when left empty.",
    type: "list",
    page: "homepage",
    group: "pink-table.hero",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "row",
    defaultsWhenEmpty: true,
    defaultRows: PINK_TABLE_FACT_ROWS_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "label",
        label: "Label",
        type: "text",
        placeholder: "Where",
        description: "Row label, e.g. Where.",
      },
      {
        key: "value",
        label: "Value",
        type: "text",
        placeholder: "Your space",
        description: "Row value, e.g. Your space.",
      },
    ],
  },

  // ── pink-table.body ─────────────────────────────────────────────────────
  {
    key: "pink-table.body-heading",
    label: "Heading",
    description: "Section heading above the description paragraphs.",
    type: "text",
    page: "homepage",
    group: "pink-table.body",
    gridColumn: "col-span-full",
    defaultValue: "What it actually is",
  },
  {
    key: "pink-table.body-paragraph-1",
    label: "Paragraph 1",
    type: "textarea",
    page: "homepage",
    group: "pink-table.body",
    gridColumn: "col-span-full",
    defaultValue:
      "We bring the table to you. Fabric, stuffing, needles and thread all show up ready to go — nobody needs to have sewn a stitch before.",
    description:
      "Default paragraph text. Use the formatted override below instead if you need bold, links or lists.",
  },
  {
    key: "pink-table.body-paragraph-2",
    label: "Paragraph 2",
    type: "textarea",
    page: "homepage",
    group: "pink-table.body",
    gridColumn: "col-span-full",
    defaultValue:
      "Each piece is small enough to finish in one sitting and sturdy enough to keep. We walk the room, so nobody gets stuck.",
    description: "Leave blank to omit.",
  },
  {
    key: "pink-table.body-paragraph-3",
    label: "Paragraph 3",
    type: "textarea",
    page: "homepage",
    group: "pink-table.body",
    gridColumn: "col-span-full",
    defaultValue: "",
    description: "Leave blank to omit.",
  },
  {
    key: "pink-table.body-richtext",
    label: "Formatted override",
    description:
      "Optional. When set, replaces the three paragraph fields above with formatted rich text.",
    type: "richtext",
    page: "homepage",
    group: "pink-table.body",
    gridColumn: "col-span-full",
    defaultValue: "",
  },

  // ── pink-table.picker ────────────────────────────────────────────────────
  {
    key: "pink-table.picker-heading",
    label: "Heading",
    type: "text",
    page: "homepage",
    group: "pink-table.picker",
    gridColumn: "col-span-1",
    defaultValue: "Pick a project",
    description: "Heading above the project selector.",
  },
  {
    key: "pink-table.picker-intro",
    label: "Intro text",
    description: "Leave blank to omit.",
    type: "text",
    page: "homepage",
    group: "pink-table.picker",
    gridColumn: "col-span-1",
    defaultValue: "Every group picks from a short list of pieces.",
  },

  // ── pink-table.timeline (hideable — blank list) ─────────────────────────
  {
    key: "pink-table.timeline-heading",
    label: "Heading",
    type: "text",
    page: "homepage",
    group: "pink-table.timeline",
    gridColumn: "col-span-full",
    defaultValue: "How a session runs",
    description:
      "Leave the timeline list below empty to hide this section entirely.",
  },
  {
    key: "pink-table.timeline",
    label: "Rows",
    description:
      "Up to six time/title/body rows. Leave empty to hide the whole timeline section.",
    type: "list",
    page: "homepage",
    group: "pink-table.timeline",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemLabel: "row",
    itemSchema: [
      {
        key: "time",
        label: "Time",
        type: "text",
        placeholder: "0:00",
        description: "Timestamp shown for this row, e.g. 0:00.",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short title for this row.",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        description:
          "One or two sentences describing this part of the session.",
      },
    ],
    defaultValue: "",
  },

  // ── pink-table.brings-provides (hideable — blank lists) ─────────────────
  {
    key: "pink-table.brings-label",
    label: "Brings label",
    type: "text",
    page: "homepage",
    group: "pink-table.brings-provides",
    gridColumn: "col-span-1",
    defaultValue: "What to bring",
    description: "Leave both lists below empty to hide this section entirely.",
  },
  {
    key: "pink-table.brings",
    label: "Rows — what to bring",
    description: "Up to six short items.",
    type: "list",
    page: "homepage",
    group: "pink-table.brings-provides",
    gridColumn: "col-span-1",
    maxItems: 6,
    itemLabel: "item",
    itemSchema: [
      {
        key: "text",
        label: "Item",
        type: "text",
        description: "One short line, e.g. an item to bring.",
      },
    ],
    defaultValue: "",
  },
  {
    key: "pink-table.provides-label",
    label: "Provides label",
    type: "text",
    page: "homepage",
    group: "pink-table.brings-provides",
    gridColumn: "col-span-1",
    defaultValue: "What's provided",
    description: "Leave both lists in this section empty to hide it entirely.",
  },
  {
    key: "pink-table.provides",
    label: "Rows — what's provided",
    description: "Up to six short items.",
    type: "list",
    page: "homepage",
    group: "pink-table.brings-provides",
    gridColumn: "col-span-1",
    maxItems: 6,
    itemLabel: "item",
    itemSchema: [
      {
        key: "text",
        label: "Item",
        type: "text",
        description: "One short line, e.g. something provided.",
      },
    ],
    defaultValue: "",
  },

  // ── pink-table.gallery (hideable — blank list) ──────────────────────────
  {
    key: "pink-table.gallery",
    label: "Images",
    description: "Up to two images, shown side by side. Leave empty to hide.",
    type: "list",
    page: "homepage",
    group: "pink-table.gallery",
    gridColumn: "col-span-full",
    maxItems: 2,
    itemLabel: "image",
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        description: "Photo shown in the gallery.",
      },
      {
        key: "alt",
        label: "Alt text",
        type: "text",
        description: "Description of the image, for screen readers.",
        optional: true,
      },
    ],
    defaultValue: "",
  },

  // ── pink-table.quote (hideable — blank text) ────────────────────────────
  {
    key: "pink-table.quote-text",
    label: "Quote text",
    description: "Leave blank to hide the quote section.",
    type: "textarea",
    page: "homepage",
    group: "pink-table.quote",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "pink-table.quote-attribution",
    label: "Attribution",
    description: "Who said it, e.g. a teacher or organizer's name and role.",
    type: "text",
    page: "homepage",
    group: "pink-table.quote",
    gridColumn: "col-span-full",
    defaultValue: "",
  },

  // ── pink-table.faq (hidden when nothing is picked) ─────────────────────
  {
    key: "pink-table.faq-heading",
    label: "Heading",
    type: "text",
    page: "homepage",
    group: "pink-table.faq",
    gridColumn: "col-span-full",
    defaultValue: "Questions people ask",
    description:
      "Leave the FAQ list below empty to hide this section entirely.",
  },
  // A Content → FAQ picker since 2026-09-26 (was a typed question/answer
  // `list`). Same key: a service saved before the switch still holds
  // `{question, answer}` rows here, and the page keeps rendering them until
  // the owner picks questions — see `resolvePinkTableFaq` in
  // `pink-table-service-page.tsx`.
  {
    key: "pink-table.faq",
    label: "Questions",
    description:
      "Pick up to eight questions from Content → FAQ to show on this page. Leave empty to hide this section. Questions typed here before keep showing until you pick some.",
    type: "faq",
    page: "homepage",
    group: "pink-table.faq",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 8,
    emptyHint: "Nothing picked, so this section is hidden.",
    rendersLegacyRows: true,
    defaultValue: "",
  },

  // ── pink-table.sidebar ───────────────────────────────────────────────────
  {
    key: "pink-table.price-eyebrow",
    label: "Label",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Cost",
    description: "Small label at the top of the cost panel.",
  },
  {
    key: "pink-table.price-fallback",
    label: "Cost line",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Quoted per group",
    description:
      "The big line in the cost panel. Shown whenever the selected project has no price label set on it in Services — leave project prices blank to keep the panel a contact-for-cost panel.",
  },
  {
    key: "pink-table.price-qualifier",
    label: "Qualifier",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Materials included. Ask and we'll confirm for your group.",
    description: "Supporting line under the cost line.",
  },
  {
    key: "pink-table.price-cta-label",
    label: "Button text",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Ask about details and cost",
    description: "Scrolls down to the request form.",
  },
  {
    key: "pink-table.quicklink-1-label",
    label: "Quick link 1 text",
    description: "Always links back to /services.",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "All make & takes",
  },
  {
    key: "pink-table.quicklink-2-label",
    label: "Quick link 2 text",
    description: "Second quick link, pointing wherever you set below.",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "See finished pieces",
  },
  {
    key: "pink-table.quicklink-2-href",
    label: "Quick link 2 link",
    description: "Where the second quick link goes.",
    type: "url",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },

  // ── pink-table.request-form ──────────────────────────────────────────────
  {
    key: "pink-table.request-heading",
    label: "Heading",
    description: "Heading above the request form.",
    type: "text",
    page: "homepage",
    group: "pink-table.request-form",
    gridColumn: "col-span-1",
    defaultValue: "Ask about a date",
  },
  {
    key: "pink-table.request-intro",
    label: "Intro text",
    description: "Leave blank to omit.",
    type: "text",
    page: "homepage",
    group: "pink-table.request-form",
    gridColumn: "col-span-1",
    defaultValue:
      "Tell us the date and room. We'll confirm within a couple of days.",
  },
  {
    key: "pink-table.request-submit-label",
    label: "Submit button text",
    description: "Label on the request form's submit button.",
    type: "text",
    page: "homepage",
    group: "pink-table.request-form",
    gridColumn: "col-span-1",
    defaultValue: "Send request",
  },
  {
    key: "pink-table.request-fallback-label",
    label: "Fallback link text",
    description:
      "Shown instead of the full form when the contact form feature is turned off.",
    type: "text",
    page: "homepage",
    group: "pink-table.request-form",
    gridColumn: "col-span-full",
    defaultValue: "Ask about a date →",
  },
];

const pinkTableFieldGroups: TemplateFieldGroup[] = [
  {
    id: "pink-table.hero",
    title: "Hero",
    description: "Duration, group size, intro text and the hero fact rows.",
    icon: "🖼️",
    columns: 2,
  },
  {
    id: "pink-table.body",
    title: "What it actually is",
    description:
      "Heading and body copy — plain paragraphs, or a formatted override.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "pink-table.picker",
    title: "Project picker",
    description: "Heading and intro text above the project selector.",
    icon: "🧷",
    columns: 2,
  },
  {
    id: "pink-table.timeline",
    title: "Timeline",
    description:
      "Optional time/title/description rows — leave empty to hide this section.",
    icon: "⏱️",
    columns: 1,
  },
  {
    id: "pink-table.brings-provides",
    title: "Brings and provides",
    description: "Two optional lists — leave both empty to hide this section.",
    icon: "🧺",
    columns: 2,
  },
  {
    id: "pink-table.gallery",
    title: "Gallery",
    description: "Optional pair of images, shown side by side.",
    icon: "📷",
    columns: 1,
  },
  {
    id: "pink-table.quote",
    title: "Pull quote",
    description: "Optional quote and attribution.",
    icon: "💬",
    columns: 1,
  },
  {
    id: "pink-table.faq",
    title: "FAQ",
    description: "Optional accordion of questions picked from Content → FAQ.",
    icon: "❓",
    columns: 1,
  },
  {
    id: "pink-table.sidebar",
    title: "Cost panel",
    description: "Labels for the cost panel and its quick links.",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "pink-table.request-form",
    title: "Request form",
    description: "Heading, intro text, and the fallback link text.",
    icon: "✉️",
    columns: 2,
  },
];

// ─── Bound resolver ───────────────────────────────────────────────────────────

const _pinkTableFieldMap = new Map<string, TemplateField>(
  pinkTableFields.map((f) => [f.key, f]),
);

export function resolvePinkTableFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _pinkTableFieldMap);
}

// ─── Exported defs ────────────────────────────────────────────────────────────

export const pinkServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "pink-table",
    label: "The Table (PinkArt)",
    description:
      "PinkArt service detail layout: photographic hero with fact rows, a project picker built from your ServiceItems, an optional timeline / brings-provides / gallery / pull-quote / FAQ, and a sticky contact-for-cost + request panel.",
    fields: pinkTableFields,
    fieldGroups: pinkTableFieldGroups,
  },
];

// ─── Derived storefront constants ──────────────────────────────────────────

export const DEFAULT_PINK_TABLE_FACT_ROWS = listRowsFromDefaults(
  PINK_TABLE_FACT_ROWS_DEFAULT_ROWS,
  "default-fact",
);
