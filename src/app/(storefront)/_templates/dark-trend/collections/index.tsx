import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const collectionsListingData: TemplateField[] = [
  {
    key: "dark-trend.collections.listing-heading",
    label: "Heading",
    description: "Main heading at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: "Collections",
    placeholder: "e.g. Shop by collection",
  },
  {
    key: "dark-trend.collections.listing-empty",
    label: "Empty state message",
    description:
      "Shown on the collections page when there are no collections yet.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: "No collections available at this time.",
    placeholder: "e.g. New collections coming soon.",
  },
];

const collectionsDetailData: TemplateField[] = [
  {
    key: "dark-trend.collections.detail-back-label",
    label: "Back link text",
    description:
      "Link back to the collections index, shown above each collection.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "All Collections",
    placeholder: "e.g. Back to collections",
  },
  {
    key: "dark-trend.collections.detail-empty",
    label: "Empty state message",
    description: "Shown on a collection page when it has no products yet.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-full",
    defaultValue: "No products in this collection yet.",
    placeholder: "e.g. Products coming soon to this collection.",
  },
  {
    key: "dark-trend.collections.detail-browse-label",
    label: "Browse-all link text",
    description:
      "Link shown below the empty state, back to the full shop. Leave blank to hide.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Browse all products",
    placeholder: "e.g. Shop everything",
  },
  {
    key: "dark-trend.collections.detail-more-heading",
    label: "Related collections heading",
    description:
      "Heading above the related-collections grid at the bottom of a collection page.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "More Collections",
    placeholder: "e.g. Explore more",
  },
];

export const darkTrendCollectionsData: TemplateField[] = [
  ...collectionsListingData,
  ...collectionsDetailData,
];

export const darkTrendCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.listing",
    title: "Collections listing",
    description:
      "Heading and empty state at the top of the collections index page.",
    icon: "📂",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "collections.detail",
    title: "Collection page",
    description:
      "Back link, empty state, and related-collections heading on an individual collection page.",
    icon: "🗂️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
