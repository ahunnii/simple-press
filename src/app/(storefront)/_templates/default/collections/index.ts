import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Copy defaults, exported so the collections pages can fall back to the same
 * string this module declares as `defaultValue` (single source of truth) —
 * needed while these keys aren't in the root field map yet, since
 * `resolveFields` can't substitute a `defaultValue` it doesn't know about.
 */
export const COLLECTIONS_LISTING_LABEL_DEFAULT = "Shop by collection";
export const COLLECTIONS_LISTING_HEADING_DEFAULT = "Collections";
export const COLLECTIONS_LISTING_EMPTY_DEFAULT =
  "No collections available at this time.";
export const COLLECTIONS_DETAIL_EMPTY_DEFAULT =
  "No products in this collection yet.";
export const COLLECTIONS_DETAIL_MORE_HEADING_DEFAULT = "More collections";

const collectionsListingData: TemplateField[] = [
  {
    key: "default.collections.listing-label",
    label: "Label above the heading",
    description:
      "Small uppercase text shown above the main heading on the collections index page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: COLLECTIONS_LISTING_LABEL_DEFAULT,
    placeholder: "e.g. Browse by category",
  },
  {
    key: "default.collections.listing-heading",
    label: "Heading",
    description: "Main heading on the collections index page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: COLLECTIONS_LISTING_HEADING_DEFAULT,
    placeholder: "e.g. Shop by category",
  },
  {
    key: "default.collections.listing-empty",
    label: "Empty state message",
    description:
      "Shown on the collections page when there are no collections yet.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: COLLECTIONS_LISTING_EMPTY_DEFAULT,
    placeholder: "e.g. New collections coming soon.",
  },
];

const collectionsDetailData: TemplateField[] = [
  {
    key: "default.collections.detail-empty",
    label: "Empty state message",
    description: "Shown on a collection page when it has no products yet.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-full",
    defaultValue: COLLECTIONS_DETAIL_EMPTY_DEFAULT,
    placeholder: "e.g. Products coming soon to this collection.",
  },
  {
    key: "default.collections.detail-more-heading",
    label: "Related collections heading",
    description:
      "Heading above the related collections shown at the bottom of a collection page.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: COLLECTIONS_DETAIL_MORE_HEADING_DEFAULT,
    placeholder: "e.g. Explore more",
  },
];

export const defaultCollectionsData: TemplateField[] = [
  ...collectionsListingData,
  ...collectionsDetailData,
];

export const defaultCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.listing",
    title: "Collections listing",
    description:
      "Label, heading, and empty state on the collections index page.",
    icon: "📂",
    columns: 2,
  },
  {
    id: "collections.detail",
    title: "Collection page",
    description:
      "Empty state and related-collections heading on an individual collection page.",
    icon: "🗂️",
    columns: 2,
  },
];
