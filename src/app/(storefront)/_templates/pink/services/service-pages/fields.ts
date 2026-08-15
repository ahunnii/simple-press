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
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const pinkTableFields: TemplateField[] = [
  // ── pink-table.hero ────────────────────────────────────────────────────
  {
    key: "pink-table.duration-label",
    label: "Duration",
    description:
      "Shown in the hero eyebrow alongside the group size. Ships blank on purpose — fill it in only once you know how long a session actually runs.",
    type: "text",
    page: "homepage",
    group: "pink-table.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "90 minutes",
  },
  {
    key: "pink-table.group-size-label",
    label: "Group Size",
    description: "Shown in the hero eyebrow alongside the duration.",
    type: "text",
    page: "homepage",
    group: "pink-table.hero",
    gridColumn: "col-span-1",
    defaultValue: "10 to 12 people",
    placeholder: "10 to 12 people",
  },
  {
    key: "pink-table.hero-intro",
    label: "Hero Intro",
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
    label: "Hero Fact Rows",
    description:
      "Up to four label/value rows shown on the blurred panel at the bottom of the hero.",
    type: "list",
    page: "homepage",
    group: "pink-table.hero",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Where" },
      {
        key: "value",
        label: "Value",
        type: "text",
        placeholder: "Your space",
      },
    ],
    defaultValue: JSON.stringify([
      {
        label: "Where",
        value: "Your space — school, church, library or workplace",
      },
      { label: "Group size", value: "10 to 12 at a table" },
      { label: "Materials", value: "Everything included" },
      { label: "Notice", value: "Book at least 2 weeks out" },
    ]),
  },

  // ── pink-table.body ─────────────────────────────────────────────────────
  {
    key: "pink-table.body-heading",
    label: "Body Heading",
    description: "Section heading above the description paragraphs.",
    type: "text",
    page: "homepage",
    group: "pink-table.body",
    gridColumn: "col-span-full",
    defaultValue: "What it actually is",
  },
  {
    key: "pink-table.body-paragraph-1",
    label: "Body Paragraph 1",
    type: "textarea",
    page: "homepage",
    group: "pink-table.body",
    gridColumn: "col-span-full",
    defaultValue:
      "We bring the table to you. Fabric, stuffing, needles and thread all show up ready to go — nobody needs to have sewn a stitch before.",
    description:
      "Default body copy. Use the richtext override below for formatted text (bold, links, lists) instead.",
  },
  {
    key: "pink-table.body-paragraph-2",
    label: "Body Paragraph 2",
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
    label: "Body Paragraph 3",
    type: "textarea",
    page: "homepage",
    group: "pink-table.body",
    gridColumn: "col-span-full",
    defaultValue: "",
    description: "Leave blank to omit.",
  },
  {
    key: "pink-table.body-richtext",
    label: "Body Richtext Override",
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
    label: "Project Picker Heading",
    type: "text",
    page: "homepage",
    group: "pink-table.picker",
    gridColumn: "col-span-1",
    defaultValue: "Pick a project",
    description: "Heading above the project selector.",
  },
  {
    key: "pink-table.picker-intro",
    label: "Project Picker Intro",
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
    label: "Timeline Heading",
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
    label: "Timeline Rows",
    description:
      "Up to six time/title/body rows. Leave empty to hide the whole timeline section.",
    type: "list",
    page: "homepage",
    group: "pink-table.timeline",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      { key: "time", label: "Time", type: "text", placeholder: "0:00" },
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
    ],
    defaultValue: "",
  },

  // ── pink-table.brings-provides (hideable — blank lists) ─────────────────
  {
    key: "pink-table.brings-label",
    label: "Brings Column Label",
    type: "text",
    page: "homepage",
    group: "pink-table.brings-provides",
    gridColumn: "col-span-1",
    defaultValue: "What to bring",
    description: "Leave both lists below empty to hide this section entirely.",
  },
  {
    key: "pink-table.brings",
    label: "Brings Rows",
    description: "Up to six em-dash rows.",
    type: "list",
    page: "homepage",
    group: "pink-table.brings-provides",
    gridColumn: "col-span-1",
    maxItems: 6,
    itemSchema: [{ key: "text", label: "Item", type: "text" }],
    defaultValue: "",
  },
  {
    key: "pink-table.provides-label",
    label: "Provides Column Label",
    type: "text",
    page: "homepage",
    group: "pink-table.brings-provides",
    gridColumn: "col-span-1",
    defaultValue: "What's provided",
    description: "Leave both lists in this section empty to hide it entirely.",
  },
  {
    key: "pink-table.provides",
    label: "Provides Rows",
    description: "Up to six em-dash rows.",
    type: "list",
    page: "homepage",
    group: "pink-table.brings-provides",
    gridColumn: "col-span-1",
    maxItems: 6,
    itemSchema: [{ key: "text", label: "Item", type: "text" }],
    defaultValue: "",
  },

  // ── pink-table.gallery (hideable — blank list) ──────────────────────────
  {
    key: "pink-table.gallery",
    label: "Gallery Images",
    description: "Up to two images, shown side by side. Leave empty to hide.",
    type: "list",
    page: "homepage",
    group: "pink-table.gallery",
    gridColumn: "col-span-full",
    maxItems: 2,
    itemSchema: [
      { key: "image", label: "Image", type: "image" },
      { key: "alt", label: "Alt Text", type: "text" },
    ],
    defaultValue: "",
  },

  // ── pink-table.quote (hideable — blank text) ────────────────────────────
  {
    key: "pink-table.quote-text",
    label: "Pull-Quote",
    description: "Leave blank to hide the pull-quote section.",
    type: "textarea",
    page: "homepage",
    group: "pink-table.quote",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "pink-table.quote-attribution",
    label: "Pull-Quote Attribution",
    description: "Who said it, e.g. a teacher or organizer's name and role.",
    type: "text",
    page: "homepage",
    group: "pink-table.quote",
    gridColumn: "col-span-full",
    defaultValue: "",
  },

  // ── pink-table.faq (hideable — blank list) ──────────────────────────────
  {
    key: "pink-table.faq-heading",
    label: "FAQ Heading",
    type: "text",
    page: "homepage",
    group: "pink-table.faq",
    gridColumn: "col-span-full",
    defaultValue: "Questions people ask",
    description:
      "Leave the FAQ list below empty to hide this section entirely.",
  },
  {
    key: "pink-table.faq",
    label: "FAQ Rows",
    description: "Up to eight question/answer rows.",
    type: "list",
    page: "homepage",
    group: "pink-table.faq",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      { key: "question", label: "Question", type: "text" },
      { key: "answer", label: "Answer", type: "textarea" },
    ],
    defaultValue: "",
  },

  // ── pink-table.sidebar ───────────────────────────────────────────────────
  {
    key: "pink-table.price-eyebrow",
    label: "Cost Panel Label",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Cost",
    description: "Small uppercase label at the top of the sidebar panel.",
  },
  {
    key: "pink-table.price-fallback",
    label: "Cost Panel Line",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Quoted per group",
    description:
      "The big line in the sidebar panel. Shown whenever the selected project has no price label set on it in Services — leave project prices blank to keep the panel a contact-for-cost panel.",
  },
  {
    key: "pink-table.price-qualifier",
    label: "Cost Qualifier",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Materials included. Ask and we'll confirm for your group.",
    description: "Muted line under the big line.",
  },
  {
    key: "pink-table.price-cta-label",
    label: "Cost Panel Button Text",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "Ask about details and cost",
    description: "Scrolls down to the request form.",
  },
  {
    key: "pink-table.quicklink-1-label",
    label: "Quick Link 1 Label",
    description: "Always links back to /services.",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "All make & takes",
  },
  {
    key: "pink-table.quicklink-2-label",
    label: "Quick Link 2 Label",
    description:
      "Second sidebar quick link — an owner-set secondary destination.",
    type: "text",
    page: "homepage",
    group: "pink-table.sidebar",
    gridColumn: "col-span-1",
    defaultValue: "See finished pieces",
  },
  {
    key: "pink-table.quicklink-2-href",
    label: "Quick Link 2 URL",
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
    label: "Request Form Heading",
    description: "Heading above the sidebar request form.",
    type: "text",
    page: "homepage",
    group: "pink-table.request-form",
    gridColumn: "col-span-1",
    defaultValue: "Ask about a date",
  },
  {
    key: "pink-table.request-intro",
    label: "Request Form Intro",
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
    label: "Request Form Submit Button Text",
    description: "Label on the request form's submit button.",
    type: "text",
    page: "homepage",
    group: "pink-table.request-form",
    gridColumn: "col-span-1",
    defaultValue: "Send request",
  },
  {
    key: "pink-table.request-fallback-label",
    label: "Request Fallback Link Text",
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
    description: "Duration, group size, intro and the hero fact rows",
    icon: "🖼️",
    columns: 2,
  },
  {
    id: "pink-table.body",
    title: "What It Actually Is",
    description:
      "Heading and body copy — plain paragraphs or a richtext override",
    icon: "📝",
    columns: 1,
  },
  {
    id: "pink-table.picker",
    title: "Project Picker",
    description: "Heading and intro above the ServiceItem selector",
    icon: "🧷",
    columns: 2,
  },
  {
    id: "pink-table.timeline",
    title: "Timeline",
    description: "Optional run-of-show rows — leave empty to hide",
    icon: "⏱️",
    columns: 1,
  },
  {
    id: "pink-table.brings-provides",
    title: "Brings / Provides",
    description: "Two optional em-dash lists — leave both empty to hide",
    icon: "🧺",
    columns: 2,
  },
  {
    id: "pink-table.gallery",
    title: "Gallery",
    description: "Optional 2-up image pair",
    icon: "📷",
    columns: 1,
  },
  {
    id: "pink-table.quote",
    title: "Pull-Quote",
    description: "Optional quote and attribution",
    icon: "💬",
    columns: 1,
  },
  {
    id: "pink-table.faq",
    title: "FAQ",
    description: "Optional question/answer accordion",
    icon: "❓",
    columns: 1,
  },
  {
    id: "pink-table.sidebar",
    title: "Sidebar Cost Panel",
    description: "Labels for the sticky contact-for-cost panel and quick links",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "pink-table.request-form",
    title: "Request Form",
    description: "Heading, intro, and the fallback link text",
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
