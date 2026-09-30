import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// ─── CollectionsPage: Hero ─────────────────────────────────────────────────
// The index page has exactly one field group: the heading block plus the
// ghost-card copy shown when no collections are published yet. The grid of
// published collections itself is data-driven and carries no fields of its
// own.

const collectionsHeroData: TemplateField[] = [
  {
    key: "olive.collections.hero-heading",
    label: "Heading",
    description: "Page title at the top of the collections index.",
    type: "text",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue: "Collections",
  },
  {
    key: "olive.collections.hero-body",
    label: "Body",
    description: "One line under the heading, above the grid of collections.",
    type: "textarea",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-full",
    defaultValue: "The whole shop, sorted by mood.",
  },
  {
    key: "olive.collections.empty-heading",
    label: "Empty state heading",
    description:
      "Shown on the ghost card when the shop has no published collections yet.",
    type: "text",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue: "Nothing to show yet.",
  },
  {
    key: "olive.collections.empty-body",
    label: "Empty state body",
    description: "One line under the empty-state heading.",
    type: "textarea",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "New collections will appear here as soon as they're published.",
  },
];

// ─── CollectionPage: single collection detail ──────────────────────────────
// The individual collection page is otherwise data-driven (the collection's
// own name, description and products), but the empty-collection message and
// the "More collections" heading are owner copy shared across every
// collection.

const collectionDetailData: TemplateField[] = [
  {
    key: "olive.collections.detail-empty-heading",
    label: "Empty collection heading",
    description: "Shown on a collection page when it has no products yet.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Nothing in this collection yet.",
  },
  {
    key: "olive.collections.detail-empty-body",
    label: "Empty collection body",
    description: "One line under the empty-collection heading.",
    type: "textarea",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue:
      "New pieces land here first — until then, shop everything else.",
  },
  {
    key: "olive.collections.more-heading",
    label: "More collections heading",
    description:
      "Heading above the row of other collections at the bottom of a collection page.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "More collections",
  },
];

export const oliveCollectionsData: TemplateField[] = [
  ...collectionsHeroData,
  ...collectionDetailData,
];

export const oliveCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.hero",
    title: "Page header",
    description:
      "Page heading and body line above the grid of published collections, plus the empty-shelf message",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "collections.detail",
    title: "Collection page",
    description:
      "Empty-collection message and the 'More collections' heading shown on every published collection page",
    icon: "🗂️",
    columns: 1,
  },
];

export const oliveCollectionsSections: TemplateSection[] = [
  {
    id: "collections.hero",
    page: "collections",
    title: "Page header",
    description: "Page heading, body line, and the grid of collections",
    groupIds: ["collections.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "collections.detail",
    page: "collections",
    title: "Collection page",
    description:
      "Empty-collection message and the 'More collections' row shown on every published collection",
    groupIds: ["collections.detail"],
    order: 1,
    hideable: false,
  },
];
