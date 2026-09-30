import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Collections / Collection ("/collections", "/collections/<slug>") —
 * parity-plan-2026-09-28 PF18 (dream previously fell back to Default here).
 * Both pages share `page: "collections"`, mirroring how `default`'s own
 * collections domain keeps listing + detail fields together (see
 * `_templates/default/collections/index.ts`). `CollectionsPage` owns
 * `collections.hero` + `collections.grid`; `CollectionPage` owns
 * `collections.detail` (empty state + related-collections heading) — no
 * template fields for the collection's own name/description/image, which
 * are Collection data, not owner copy (CollectionPage playbook: "purely
 * data-driven").
 *
 * Group-id convention: `"<page>.<group>"`, unprefixed — this is what makes
 * the sectionGroupAttr/fieldAttr/isSectionVisible triple match sections.ts
 * and the rendered `data-sp-group` (mirrors dream's services/about domains).
 */

// ─── collections.hero — NOT hideable (the page's sole <h1>) ────────────────

const collectionsHeroData: TemplateField[] = [
  {
    key: "dream.collections.hero-heading",
    label: "Heading",
    description: "The page's H1, shown before the highlighted word.",
    type: "text",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop by",
  },
  {
    key: "dream.collections.hero-accent",
    label: "Highlighted word",
    description:
      "One script-styled word after the heading. Never more than one word.",
    type: "text",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue: "Collection",
  },
  {
    key: "dream.collections.hero-lede",
    label: "Intro",
    description: "Short line under the hero heading.",
    type: "textarea",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Curated sets of Selest's decor, rentals, and draping, grouped by the moments they're built for.",
  },
];

// ─── collections.grid — NOT hideable (wraps the grid/empty state) ──────────

const collectionsGridData: TemplateField[] = [
  {
    key: "dream.collections.grid-empty-heading",
    label: "Empty state heading",
    description: "Shown on the collections page when none are published yet.",
    type: "text",
    page: "collections",
    group: "collections.grid",
    gridColumn: "col-span-1",
    defaultValue: "New collections are on their way",
  },
  {
    key: "dream.collections.grid-empty-body",
    label: "Empty state message",
    description: "Short line under the empty state heading.",
    type: "textarea",
    page: "collections",
    group: "collections.grid",
    gridColumn: "col-span-full",
    defaultValue:
      "Selest is still building these sets. Browse everything in the shop instead.",
  },
  {
    key: "dream.collections.grid-empty-cta-label",
    label: "Empty state button label",
    description:
      "Label for the button shown with the empty state. Leave blank to hide the button.",
    type: "text",
    page: "collections",
    group: "collections.grid",
    gridColumn: "col-span-1",
    defaultValue: "Browse the shop",
  },
  {
    key: "dream.collections.grid-empty-cta-url",
    label: "Empty state button link",
    description: "Where the empty state button links to.",
    type: "url",
    page: "collections",
    group: "collections.grid",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── collections.detail — NOT hideable (CollectionPage only) ───────────────

const collectionsDetailData: TemplateField[] = [
  {
    key: "dream.collections.detail-empty-heading",
    label: "Empty collection heading",
    description: "Shown on a collection page when it has no products yet.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Nothing here yet",
  },
  {
    key: "dream.collections.detail-empty-body",
    label: "Empty collection message",
    description: "Short line under the empty collection heading.",
    type: "textarea",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-full",
    defaultValue:
      "Selest hasn't added pieces to this collection yet. Browse everything in the shop instead.",
  },
  {
    key: "dream.collections.detail-empty-cta-label",
    label: "Empty collection button label",
    description:
      "Label for the button shown when a collection has no products. Leave blank to hide the button.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Browse the shop",
  },
  {
    key: "dream.collections.detail-empty-cta-url",
    label: "Empty collection button link",
    description: "Where the empty collection button links to.",
    type: "url",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "dream.collections.detail-more-heading",
    label: "Related collections heading",
    description:
      "Heading above the related collections shown at the bottom of a collection page.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "More collections",
  },
];

// ─── Aggregated export ──────────────────────────────────────────────────────

export const dreamCollectionsData: TemplateField[] = [
  ...collectionsHeroData,
  ...collectionsGridData,
  ...collectionsDetailData,
];

export const dreamCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.hero",
    title: "Page header",
    description: "Heading, highlighted word, and intro",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "collections.grid",
    title: "Collections grid",
    description: "Empty-state heading, message, and shop link",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "collections.detail",
    title: "Collection page",
    description:
      "Empty-state and related-collections heading on an individual collection page",
    icon: "📦",
    columns: 2,
  },
];

export const dreamCollectionsSections: TemplateSection[] = [
  {
    id: "collections.hero",
    page: "collections",
    title: "Page header",
    description: "Logo, heading, and intro",
    groupIds: ["collections.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "collections.grid",
    page: "collections",
    title: "Collections grid",
    description: "Empty-state heading, message, and shop link",
    groupIds: ["collections.grid"],
    order: 1,
    hideable: false,
  },
  {
    id: "collections.detail",
    page: "collections",
    title: "Collection page",
    description:
      "Empty-state and related-collections heading on an individual collection page",
    groupIds: ["collections.detail"],
    order: 2,
    hideable: false,
  },
];
