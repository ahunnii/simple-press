import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field/group/section registry for the coop `GenericPage` slot — dual mode
 * (the Project Gallery Page + arbitrary CMS pages). Exported FLAT (not
 * wrapped in a `{ coop: [...] }` map) per this slot's export contract: the
 * root `_templates/coop/index.ts` / `sections.ts` (both locked this phase —
 * see docs/templates/coop/build/reports/D-phase3.md) are expected to spread
 * `coopGenericData` / `coopGenericFieldGroups` / `coopGenericSections` into
 * their own aggregation once every page module is done, mirroring how
 * `coop-header.tsx` / `coop-footer.tsx` already import `resolveFields` from
 * the (eventually-aggregated) root.
 *
 * `TemplatePage` (src/lib/template-fields.ts) has no "generic" value, so
 * every field below is declared `page: "global"` per design.md's dual-mode
 * spec. Content fields are prefixed `coop.gallery.*`; the one mode-detection
 * / routing field is prefixed `coop.global.gallery.*` to sit alongside the
 * existing `coop.global.header.*` / `coop.global.footer.*` chrome fields
 * from Phase 2.
 *
 * CMS mode (any page whose slug isn't the configured gallery slug) has NO
 * fields of its own — it renders the CMS `Page` record's own title/content
 * plus the platform policy notice, so there's nothing owner-editable beyond
 * what the CMS page editor already provides.
 */

export const coopGenericData: TemplateField[] = [
  // ─── Gallery intro (mode-detection field lives here too) ───────────────
  {
    key: "coop.global.gallery.slug",
    label: "Project Gallery — Page Slug",
    description:
      "The URL slug of the CMS page that renders as the Project Gallery (photo wall). Must match an existing page's slug exactly — any other slug renders as a plain content page.",
    type: "text",
    page: "global",
    group: "global.gallery-intro",
    gridColumn: "col-span-1",
    defaultValue: "project-gallery-page",
  },
  {
    key: "coop.gallery.intro-label",
    label: "Gallery — Intro Label",
    description: "Small uppercase label above the gallery photo wall.",
    type: "text",
    page: "global",
    group: "global.gallery-intro",
    gridColumn: "col-span-1",
    defaultValue: "PROJECT Photos",
  },

  // ─── Photo stack A — 12 full-width stacked photos ──────────────────────
  {
    key: "coop.gallery.photos-a",
    label: "Gallery — Photos (Full-Width Stack)",
    description:
      "The main stacked row of project photos. Defaults to 12 restoration project photos from the original site. Each photo's on-page height is fixed by its position, not by the image itself, so swapping a photo keeps the page layout stable. Leave a row's photo blank to fall back to the row's default image.",
    type: "list",
    page: "global",
    group: "global.gallery-photos-a",
    gridColumn: "col-span-full",
    maxItems: 12,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        placeholder: "Upload a project photo",
      },
      {
        key: "alt",
        label: "Alt text",
        type: "text",
        placeholder: "Describe the photo",
      },
    ],
  },

  // ─── Photo stack B — 4 large-format aspect-ratio'd photos ──────────────
  {
    key: "coop.gallery.photos-b",
    label: "Gallery — Photos (Large Format)",
    description:
      "A secondary set of large-format project photos shown below the main stack. Defaults to 4 photos from the original site.",
    type: "list",
    page: "global",
    group: "global.gallery-photos-b",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        placeholder: "Upload a project photo",
      },
      {
        key: "alt",
        label: "Alt text",
        type: "text",
        placeholder: "Describe the photo",
      },
    ],
  },

  // ─── Gallery outro ──────────────────────────────────────────────────────
  {
    key: "coop.gallery.outro-text",
    label: "Gallery — Closing Statement",
    description: "Bold closing statement shown below the photo wall.",
    type: "textarea",
    page: "global",
    group: "global.gallery-outro",
    gridColumn: "col-span-full",
    defaultValue:
      "Building Cooperatively is a worker-owned cooperative specializing in historic restoration and construction. We restore historic hardware, trim, flooring, doors, cabinetry, window repair, tiling, and many forms of rough and finish carpentry. We do exteriors, wood siding, paint, lot beautification, water catchment systems, and hoop houses for your farm or garden.",
  },
  {
    key: "coop.gallery.cta-text",
    label: "Gallery — Closing CTA Text",
    description:
      "Underlined call-to-action link below the closing statement. The double spaces between words are intentional — they match the original site's typesetting.",
    type: "text",
    page: "global",
    group: "global.gallery-outro",
    gridColumn: "col-span-1",
    defaultValue:
      "Contact  us  to  schedule  your  next  restoration  or  workshop",
  },
  {
    key: "coop.gallery.cta-href",
    label: "Gallery — Closing CTA Link",
    description: "Where the closing CTA link points to.",
    type: "url",
    page: "global",
    group: "global.gallery-outro",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

export const coopGenericFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.gallery-intro",
    title: "Gallery — Intro",
    description:
      "The Project Gallery page's slug + intro label. Always shown; not hideable.",
    icon: "🖼️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "global.gallery-photos-a",
    title: "Gallery — Photo Stack",
    description: "The main full-width stack of project photos.",
    icon: "📷",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "global.gallery-photos-b",
    title: "Gallery — Large Format Photos",
    description: "A secondary set of large-format project photos.",
    icon: "🏗️",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "global.gallery-outro",
    title: "Gallery — Closing",
    description: "The closing statement and contact CTA below the photo wall.",
    icon: "✉️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

export const coopGenericSections: TemplateSection[] = [
  {
    id: "global.gallery-intro",
    page: "global",
    title: "Gallery Intro",
    description: "Intro label above the photo wall (always shown).",
    groupIds: ["global.gallery-intro"],
    order: 1,
    hideable: false,
  },
  {
    id: "global.gallery-photos-a",
    page: "global",
    title: "Gallery Photo Stack",
    description: "The main stack of project photos.",
    groupIds: ["global.gallery-photos-a"],
    order: 2,
    hideable: true,
  },
  {
    id: "global.gallery-photos-b",
    page: "global",
    title: "Gallery Large-Format Photos",
    description: "The secondary set of large-format project photos.",
    groupIds: ["global.gallery-photos-b"],
    order: 3,
    hideable: true,
  },
  {
    id: "global.gallery-outro",
    page: "global",
    title: "Gallery Closing",
    description: "Closing statement + contact CTA below the photo wall.",
    groupIds: ["global.gallery-outro"],
    order: 4,
    hideable: true,
  },
];
