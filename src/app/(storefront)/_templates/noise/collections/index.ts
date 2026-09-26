import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Collections fields for the `noise` template — index AND detail pages,
 * both `page: "collections"` (pink's approach: one editor page, two field
 * groups). Per-collection content (name, description, image, products)
 * always comes from the `Collection` record; fields here cover the chrome
 * copy around it.
 */
const collectionsListingData: TemplateField[] = [
  {
    key: "noise.collections.overline",
    label: "Small label",
    description: "Small label above the heading on the collections page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "Browse",
  },
  {
    key: "noise.collections.heading",
    label: "Heading",
    description: "Main heading on the collections page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "All Collections",
  },
  {
    key: "noise.collections.cta-text",
    label: "Button text",
    description: "Text for the link below the heading that points to the shop.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "View all products →",
  },
  {
    key: "noise.collections.empty-text",
    label: "Empty state text",
    description: "Shown when you have no published collections yet.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: "No collections available at this time.",
  },
];

const collectionsDetailData: TemplateField[] = [
  {
    key: "noise.collections.detail-overline",
    label: "Small label",
    description: "Small label above the collection name on a collection page.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Collection",
  },
  {
    key: "noise.collections.detail-empty-text",
    label: "Empty state text",
    description: "Shown when a collection has no published products yet.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "No garments in this collection yet.",
  },
  {
    key: "noise.collections.detail-browse-text",
    label: "Empty state link text",
    description: "Link text shown below the empty-state message.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Browse All Garments →",
  },
  {
    key: "noise.collections.detail-back-label",
    label: "Back link text",
    description: "Label for the back-to-collections link in the product grid.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "All Collections",
  },
  {
    key: "noise.collections.more-overline",
    label: "Small label",
    description: 'Small label above the "more collections" heading.',
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Continue exploring",
  },
  {
    key: "noise.collections.more-heading",
    label: "Heading",
    description: "Heading above the related-collections grid.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "More collections.",
  },
];

export const noiseCollectionsData: TemplateField[] = [
  ...collectionsListingData,
  ...collectionsDetailData,
];

export const noiseCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.listing",
    title: "Collections page",
    description:
      "Small label, heading, button, and empty state on the collections page.",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "collections.detail",
    title: "Collection page",
    description:
      'Small label, empty state, back link, and "more collections" heading on a collection page.',
    icon: "🧵",
    columns: 2,
  },
];
