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
    label: "Collections Overline",
    description: "Small caps label above the collections index heading",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "Browse",
  },
  {
    key: "noise.collections.heading",
    label: "Collections Heading",
    description: "Main H1 on the collections index",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "All Collections",
  },
  {
    key: "noise.collections.cta-text",
    label: "Collections CTA Text",
    description: "Link below the heading pointing at the shop",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "View all products →",
  },
  {
    key: "noise.collections.empty-text",
    label: "Empty State Text",
    description: "Shown when the business has no published collections",
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
    label: "Detail Overline",
    description: "Small caps label above the collection name on a detail page",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Collection",
  },
  {
    key: "noise.collections.detail-empty-text",
    label: "Detail Empty State Text",
    description: "Shown when a collection has no published products",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "No garments in this collection yet.",
  },
  {
    key: "noise.collections.detail-browse-text",
    label: "Detail Empty State Link",
    description: "Link text shown below the empty-state message",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Browse All Garments →",
  },
  {
    key: "noise.collections.detail-back-label",
    label: "Back Link Label",
    description: "Label for the back-to-collections link in the product grid",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "All Collections",
  },
  {
    key: "noise.collections.more-overline",
    label: "More Collections Overline",
    description: "Small caps label above the \"more collections\" heading",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Continue exploring",
  },
  {
    key: "noise.collections.more-heading",
    label: "More Collections Heading",
    description: "Heading above the related-collections grid",
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
    title: "Collections — Listing",
    description: "Overline, heading, CTA, and empty state on the collections index",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "collections.detail",
    title: "Collections — Detail",
    description:
      "Overline, empty state, back link, and \"more collections\" heading on a collection detail page",
    icon: "🧵",
    columns: 2,
  },
];
