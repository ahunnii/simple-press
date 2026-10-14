/**
 * Dream-specific service-page template field definitions.
 *
 * Two templates:
 *   dream-lane    — the default: hero, optional centered main photo, an
 *                   owner list of adaptive sections, an optional gallery,
 *                   an Options grid built from the service's `ServiceItem`s,
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

import { DREAM_QUOTE_HREF } from "../../shared/dream-quote-href";
import {
  DREAM_LANE_SECTIONS_DEFAULT_ROWS,
  DREAM_LANE_SECTIONS_KEY,
} from "./dream-lane-sections-defaults";

// ─── dream-lane ─────────────────────────────────────────────────────────────
// The hero renders straight from `service.name`, `service.description`, and
// `service.image` (design.md "Service-page variants → dream-lane"); the only
// hero-side template fields are the "Main photo" switches below.
//
// Retired 2026-10-14: the numbered `dream-lane.block-{1,2,3}-{heading,body,
// image,alt,image-crop}` fields became the `dream-lane.sections` list. The old
// keys are NOT read as a fallback (the list editor can't show rows built from
// them); `scripts/dream/backfill-dream-lane-sections.ts` copies saved blocks
// into the list. They need no `RETIRED_TEMPLATE_KEYS` entry — that set only
// serves the visual editor's SiteContent "custom pairs" UI; the service
// editor saves `Service.customFields` whole, so old values stay in place.

export const dreamLaneFields: TemplateField[] = [
  // Main photo (the service's own image — set on the service itself)
  {
    key: "dream-lane.show-cover",
    label: "Show main photo at the top",
    description:
      "On shows this service's main photo, centered, under the title. Off hides it on this page only.",
    type: "boolean",
    page: "homepage",
    group: "dream-lane.hero",
    gridColumn: "col-span-full",
    defaultValue: "true",
  },
  {
    key: "dream-lane.image-crop",
    label: "Crop to fill the frame",
    description:
      "Applies to this service's main photo at the top of its page and on the Services page. Off shows the whole photo on a soft blurred backdrop.",
    type: "boolean",
    page: "homepage",
    group: "dream-lane.hero",
    gridColumn: "col-span-full",
    defaultValue: "false",
  },

  // Sections
  {
    key: "dream-lane.sections-visible",
    label: "Show sections",
    description: "Off hides every section, including the built-in examples.",
    type: "boolean",
    page: "homepage",
    group: "dream-lane.sections",
    gridColumn: "col-span-full",
    defaultValue: "true",
  },
  {
    key: DREAM_LANE_SECTIONS_KEY,
    label: "Sections",
    description:
      "Short text, a photo, or both. Add, remove, or drag to reorder. Each section adapts to what you fill in: text with a photo sits side by side, a photo alone is shown wide, and text alone is centered. Deleting every section brings the built-in examples back — use Show sections to hide them instead.",
    type: "list",
    page: "homepage",
    group: "dream-lane.sections",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 8,
    itemLabel: "section",
    summaryKey: "heading",
    defaultsWhenEmpty: true,
    defaultRows: DREAM_LANE_SECTIONS_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "heading",
        label: "Heading",
        type: "text",
        optional: true,
        placeholder: "e.g. How it starts",
      },
      {
        key: "body",
        label: "Text",
        type: "textarea",
        optional: true,
        description: "Keep it short — a sentence or two.",
      },
      {
        key: "image",
        label: "Photo",
        type: "image",
        description:
          "Leave empty for a text-only section. A photo with no text is shown wide.",
      },
      {
        key: "alt",
        label: "Photo description",
        type: "text",
        optional: true,
        description: "Describes the photo for screen readers.",
      },
      {
        key: "crop",
        label: "Crop to fill the frame",
        type: "boolean",
        optional: true,
        description: "Off shows the whole photo on a soft blurred backdrop.",
      },
    ],
  },

  // Gallery
  {
    key: "dream-lane.gallery",
    label: "Gallery",
    description:
      "Pick a photo gallery to show under the sections. Leave unset to show none.",
    type: "gallery",
    page: "homepage",
    group: "dream-lane.gallery",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "dream-lane.gallery-heading",
    label: "Gallery heading",
    description: "Heading above the gallery.",
    type: "text",
    page: "homepage",
    group: "dream-lane.gallery",
    gridColumn: "col-span-full",
    defaultValue: "See it styled",
  },
  {
    key: "dream-lane.gallery-lede",
    label: "Gallery intro",
    description: "Optional short line beside the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "dream-lane.gallery",
    gridColumn: "col-span-full",
    defaultValue: "",
  },

  // Options grid heading
  {
    key: "dream-lane.options-heading",
    label: "Heading",
    description:
      "Heading above the grid built from this service's items. Only shown when the service has published items.",
    type: "text",
    page: "homepage",
    group: "dream-lane.options",
    gridColumn: "col-span-full",
    defaultValue: "Options",
  },

  // Closing banner
  {
    key: "dream-lane.cta-heading",
    label: "Heading",
    description:
      "Heading for the closing section (the highlighted word follows it).",
    type: "text",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: "dream-lane.cta-accent",
    label: "Highlighted word",
    description:
      'Script-styled word rendered after the heading (e.g. "Estimate Quote"). Leave blank to hide.',
    type: "text",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream-lane.cta-lede",
    label: "Intro",
    description: "Short line under this section's heading.",
    type: "textarea",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Send Selest your event details and she'll help make this part of your day.",
  },
  {
    key: "dream-lane.cta-label",
    label: "Button label",
    description: "Label for this section's button.",
    type: "text",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream-lane.cta-url",
    label: "Button link",
    description: "Where this section's button links to.",
    type: "url",
    page: "homepage",
    group: "dream-lane.cta",
    gridColumn: "col-span-1",
    defaultValue: DREAM_QUOTE_HREF,
  },
];

export const dreamLaneFieldGroups: TemplateFieldGroup[] = [
  {
    id: "dream-lane.hero",
    title: "Main photo",
    description:
      "How this service's main photo fits its frame. Pick the photo itself on the service.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "dream-lane.sections",
    title: "Sections",
    description:
      "Short text and photos beneath the main photo. Each section adapts to what you fill in.",
    icon: "🎀",
    columns: 1,
  },
  {
    id: "dream-lane.gallery",
    title: "Gallery",
    description:
      "An optional photo gallery shown after the sections. Create galleries in the Gallery section of your admin.",
    icon: "📸",
    columns: 1,
  },
  {
    id: "dream-lane.options",
    title: "Options grid",
    description:
      "Heading above the grid built from this service's items (name, price, duration, tiers, add-ons).",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "dream-lane.cta",
    title: "Closing banner",
    description: "Quote request section beneath the Options grid.",
    icon: "💌",
    columns: 2,
  },
];

// ─── dream-package ──────────────────────────────────────────────────────────

export const dreamPackageFields: TemplateField[] = [
  {
    key: "dream-package.intro",
    label: "Intro",
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
    label: "Heading",
    type: "text",
    page: "homepage",
    group: "dream-package.how-to-choose",
    gridColumn: "col-span-full",
    description: "Heading above the three short paragraphs.",
    defaultValue: "How to choose",
  },
  {
    key: "dream-package.how-to-choose-1",
    label: "Paragraph 1",
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
    label: "Paragraph 2",
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
    label: "Paragraph 3",
    description: "Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "dream-package.how-to-choose",
    gridColumn: "col-span-full",
    defaultValue:
      "Not sure where to start? Send a few photos of your space and she'll recommend a package.",
  },

  // Closing banner
  {
    key: "dream-package.grid-heading",
    label: "Package grid heading",
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
    label: "Heading",
    description:
      "Heading for the closing section (the highlighted word follows it).",
    type: "text",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: "dream-package.cta-accent",
    label: "Highlighted word",
    description:
      'Script-styled word rendered after the heading (e.g. "Estimate Quote"). Leave blank to hide.',
    type: "text",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream-package.cta-lede",
    label: "Intro",
    description: "Short line under this section's heading.",
    type: "textarea",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell Selest which package caught your eye and she'll confirm what's possible for your date.",
  },
  {
    key: "dream-package.cta-label",
    label: "Button label",
    description: "Label for this section's button.",
    type: "text",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream-package.cta-url",
    label: "Button link",
    description: "Where this section's button links to.",
    type: "url",
    page: "homepage",
    group: "dream-package.cta",
    gridColumn: "col-span-1",
    defaultValue: DREAM_QUOTE_HREF,
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
    title: "How to choose",
    description:
      "Heading and up to three short paragraphs beneath the tier grid.",
    icon: "🤔",
    columns: 1,
  },
  {
    id: "dream-package.cta",
    title: "Closing banner",
    description: "Quote request section beneath the how-to-choose paragraphs.",
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

/**
 * How a Dream lane photo meets its frame, read from a raw
 * `Service.customFields` value. Stored as the switch's "Crop to fill the
 * frame" boolean: only `"true"` crops (`"cover"`); unset, `"false"` or
 * anything else shows the whole photo (`"contain"`, the default).
 */
export function dreamLaneImageFit(
  customFields: unknown,
  key: string,
): "cover" | "contain" {
  if (
    customFields === null ||
    typeof customFields !== "object" ||
    Array.isArray(customFields)
  ) {
    return "contain";
  }
  return (customFields as Record<string, unknown>)[key] === "true"
    ? "cover"
    : "contain";
}

// ─── Exported defs ──────────────────────────────────────────────────────────
// dream-lane is FIRST — the default per-service template (design.md
// "Service-page variants": "dream-lane (default)").

export const dreamServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "dream-lane",
    label: "Lane",
    description:
      "Hero, a centered main photo, short text-and-photo sections you add and reorder, an optional gallery, an Options grid built from this service's items (pricing, tiers, add-ons, booking), and a closing Estimate Quote band.",
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
