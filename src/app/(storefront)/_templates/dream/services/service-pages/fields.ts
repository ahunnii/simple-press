/**
 * Dream-specific service-page template field definitions.
 *
 * Two templates:
 *   dream-lane    — the default: hero, three alternating story blocks, an
 *                   Options grid built from the service's `ServiceItem`s,
 *                   and a closing Estimate Quote band.
 *   dream-package — hero, intro, a tier grid of `ServiceItem` package
 *                   cards, a "How to choose" band, and a closing Estimate
 *                   Quote band.
 *
 * Field key convention: "<def-id>.<field-slug>" (matches
 * `src/lib/service-templates.ts`'s `ServiceTemplateDef` contract).
 *
 * `page: "homepage"` on every field below follows the established
 * convention for per-service-template fields (see wealth-essay/
 * wealth-program, vii-atelier, pink-table): these fields live on
 * `Service.customFields`, edited at `/admin/services/[id]`, NOT the visual
 * editor — there is no `sections.ts` entry for a service detail page, so
 * the `page` value is otherwise unused here.
 */
import type { ServiceTemplateDef } from "~/lib/service-templates";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

// ─── dream-lane ─────────────────────────────────────────────────────────────
// Hero is NOT a field group — it renders straight from `service.name`,
// `service.description`, and `service.image` (design.md "Service-page
// variants → dream-lane").

export const dreamLaneFields: TemplateField[] = [
  // Story block 1
  {
    key: "dream-lane.block-1-heading",
    label: "Story Block 1 Heading",
    description: "Leave blank to hide this block entirely.",
    type: "text",
    page: "homepage",
    group: "dream-lane.block-1",
    gridColumn: "col-span-full",
    defaultValue: "How it starts",
  },
  {
    key: "dream-lane.block-1-body",
    label: "Story Block 1 Body",
    type: "textarea",
    page: "homepage",
    group: "dream-lane.block-1",
    gridColumn: "col-span-full",
    description: "Short paragraph for this block.",
    defaultValue:
      "Share your event date, venue, and the look you're imagining. Selest sketches a plan built around your colors and space.",
  },
  {
    key: "dream-lane.block-1-image",
    label: "Story Block 1 Image",
    description: "Photo shown alongside this block.",
    type: "image",
    page: "homepage",
    group: "dream-lane.block-1",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dream-lane.block-1-alt",
    label: "Story Block 1 Image Alt Text",
    description: "Describes this block's photo for screen readers.",
    type: "text",
    page: "homepage",
    group: "dream-lane.block-1",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Story block 2
  {
    key: "dream-lane.block-2-heading",
    label: "Story Block 2 Heading",
    description: "Leave blank to hide this block entirely.",
    type: "text",
    page: "homepage",
    group: "dream-lane.block-2",
    gridColumn: "col-span-full",
    defaultValue: "What's included",
  },
  {
    key: "dream-lane.block-2-body",
    label: "Story Block 2 Body",
    type: "textarea",
    page: "homepage",
    group: "dream-lane.block-2",
    gridColumn: "col-span-full",
    description: "Short paragraph for this block.",
    defaultValue:
      "Every layer — panels, colors, chairs, and accents — is chosen to fit your theme, then delivered and styled on site.",
  },
  {
    key: "dream-lane.block-2-image",
    label: "Story Block 2 Image",
    description: "Photo shown alongside this block.",
    type: "image",
    page: "homepage",
    group: "dream-lane.block-2",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dream-lane.block-2-alt",
    label: "Story Block 2 Image Alt Text",
    description: "Describes this block's photo for screen readers.",
    type: "text",
    page: "homepage",
    group: "dream-lane.block-2",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Story block 3
  {
    key: "dream-lane.block-3-heading",
    label: "Story Block 3 Heading",
    description: "Leave blank to hide this block entirely.",
    type: "text",
    page: "homepage",
    group: "dream-lane.block-3",
    gridColumn: "col-span-full",
    defaultValue: "On the day",
  },
  {
    key: "dream-lane.block-3-body",
    label: "Story Block 3 Body",
    type: "textarea",
    page: "homepage",
    group: "dream-lane.block-3",
    gridColumn: "col-span-full",
    description: "Short paragraph for this block.",
    defaultValue:
      "Selest arrives ahead of your event to install the full look, then returns after to break it down.",
  },
  {
    key: "dream-lane.block-3-image",
    label: "Story Block 3 Image",
    description: "Photo shown alongside this block.",
    type: "image",
    page: "homepage",
    group: "dream-lane.block-3",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dream-lane.block-3-alt",
    label: "Story Block 3 Image Alt Text",
    description: "Describes this block's photo for screen readers.",
    type: "text",
    page: "homepage",
    group: "dream-lane.block-3",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Options grid heading
  {
    key: "dream-lane.options-heading",
    label: "Options Heading",
    description:
      "Heading above the grid built from this service's items. Only shown when the service has published items.",
    type: "text",
    page: "homepage",
    group: "dream-lane.options",
    gridColumn: "col-span-full",
    defaultValue: "Options",
  },

  // Closing CTA
  {
    key: "dream-lane.cta-heading",
    label: "Closing CTA Heading",
    description:
      "Heading for the closing Estimate Quote band (the script accent word follows it).",
    type: "text",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: "dream-lane.cta-accent",
    label: "Closing CTA Accent Word",
    description:
      'Script accent rendered after the heading (e.g. "Estimate Quote"). Leave blank to hide.',
    type: "text",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream-lane.cta-lede",
    label: "Closing CTA Lede",
    description: "Short line under the closing CTA heading.",
    type: "textarea",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Send Selest your event details and she'll help make this part of your day.",
  },
  {
    key: "dream-lane.cta-label",
    label: "Closing CTA Button Label",
    description: "Label for the closing CTA button.",
    type: "text",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream-lane.cta-url",
    label: "Closing CTA Button URL",
    description: "Where the closing CTA button links to.",
    type: "url",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

export const dreamLaneFieldGroups: TemplateFieldGroup[] = [
  {
    id: "dream-lane.block-1",
    title: "Story Block 1",
    description: "First alternating text/image block. Blank heading hides it.",
    icon: "🎀",
    columns: 2,
  },
  {
    id: "dream-lane.block-2",
    title: "Story Block 2",
    description: "Second alternating text/image block. Blank heading hides it.",
    icon: "🎁",
    columns: 2,
  },
  {
    id: "dream-lane.block-3",
    title: "Story Block 3",
    description: "Third alternating text/image block. Blank heading hides it.",
    icon: "✨",
    columns: 2,
  },
  {
    id: "dream-lane.options",
    title: "Options Grid",
    description:
      "Heading above the grid built from this service's items (name, price, duration, tiers, add-ons).",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "dream-lane.cta",
    title: "Closing Call to Action",
    description: "Estimate Quote band beneath the Options grid.",
    icon: "💌",
    columns: 2,
  },
];

// ─── dream-package ──────────────────────────────────────────────────────────

export const dreamPackageFields: TemplateField[] = [
  {
    key: "dream-package.intro",
    label: "Intro Paragraph",
    description: "Short paragraph shown under the hero, before the tier grid.",
    type: "textarea",
    page: "homepage",
    group: "dream-package.intro",
    gridColumn: "col-span-full",
    defaultValue:
      "Each package below is a starting point. Selest adjusts colors, sizing, and extras to match your event.",
  },

  {
    key: "dream-package.how-to-choose-heading",
    label: '"How to Choose" Heading',
    type: "text",
    page: "homepage",
    group: "dream-package.how-to-choose",
    gridColumn: "col-span-full",
    description: "Heading above the three short paragraphs.",
    defaultValue: "How to choose",
  },
  {
    key: "dream-package.how-to-choose-1",
    label: "How to Choose — Paragraph 1",
    description: "Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "dream-package.how-to-choose",
    gridColumn: "col-span-full",
    defaultValue:
      "Think about your guest count and whether you want a single accent or a full room transformation.",
  },
  {
    key: "dream-package.how-to-choose-2",
    label: "How to Choose — Paragraph 2",
    description: "Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "dream-package.how-to-choose",
    gridColumn: "col-span-full",
    defaultValue:
      "Pick the package closest to your vision, then ask Selest about adding or removing pieces.",
  },
  {
    key: "dream-package.how-to-choose-3",
    label: "How to Choose — Paragraph 3",
    description: "Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "dream-package.how-to-choose",
    gridColumn: "col-span-full",
    defaultValue:
      "Not sure where to start? Send a few photos of your space and she'll recommend a package.",
  },

  // Closing CTA
  {
    key: "dream-package.grid-heading",
    label: "Package Grid Heading",
    description:
      "Heading above the package tiers. Leave blank to hide the heading.",
    type: "text",
    page: "homepage",
    group: "dream-package.intro",
    gridColumn: "col-span-full",
    defaultValue: "Choose your package",
  },
  {
    key: "dream-package.cta-heading",
    label: "Closing CTA Heading",
    description:
      "Heading for the closing Estimate Quote band (the script accent word follows it).",
    type: "text",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: "dream-package.cta-accent",
    label: "Closing CTA Accent Word",
    description:
      'Script accent rendered after the heading (e.g. "Estimate Quote"). Leave blank to hide.',
    type: "text",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream-package.cta-lede",
    label: "Closing CTA Lede",
    description: "Short line under the closing CTA heading.",
    type: "textarea",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell Selest which package caught your eye and she'll confirm what's possible for your date.",
  },
  {
    key: "dream-package.cta-label",
    label: "Closing CTA Button Label",
    description: "Label for the closing CTA button.",
    type: "text",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream-package.cta-url",
    label: "Closing CTA Button URL",
    description: "Where the closing CTA button links to.",
    type: "url",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

export const dreamPackageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "dream-package.intro",
    title: "Intro",
    description: "Short paragraph shown under the hero.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "dream-package.how-to-choose",
    title: "How to Choose",
    description:
      "Heading and up to three short paragraphs beneath the tier grid.",
    icon: "🤔",
    columns: 1,
  },
  {
    id: "dream-package.cta",
    title: "Closing Call to Action",
    description: "Estimate Quote band beneath the how-to-choose paragraphs.",
    icon: "💌",
    columns: 2,
  },
];

// ─── Bound field resolvers (one per template) ──────────────────────────────

const _laneFieldMap = new Map<string, TemplateField>(
  dreamLaneFields.map((f) => [f.key, f]),
);

export function resolveDreamLaneFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _laneFieldMap);
}

const _packageFieldMap = new Map<string, TemplateField>(
  dreamPackageFields.map((f) => [f.key, f]),
);

export function resolveDreamPackageFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _packageFieldMap);
}

// ─── Exported defs ──────────────────────────────────────────────────────────
// dream-lane is FIRST — the default per-service template (design.md
// "Service-page variants": "dream-lane (default)").

export const dreamServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "dream-lane",
    label: "Lane",
    description:
      "Hero, three alternating story blocks, an Options grid built from this service's items (pricing, tiers, add-ons, booking), and a closing Estimate Quote band.",
    fields: dreamLaneFields,
    fieldGroups: dreamLaneFieldGroups,
  },
  {
    id: "dream-package",
    label: "Package",
    description:
      'Hero, intro paragraph, a tier grid of package cards built from this service\'s items, a "How to choose" band, and a closing Estimate Quote band.',
    fields: dreamPackageFields,
    fieldGroups: dreamPackageFieldGroups,
  },
];
