import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const collectionsPageData: TemplateField[] = [
  {
    key: "bamboo.collections.listing-title",
    label: "Collections listing title",
    description: "Main heading on the collections index page",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: "Our Collections",
    placeholder: "Our Collections",
  },
  {
    key: "bamboo.collections.listing-intro",
    label: "Collections listing intro",
    description: "Short intro below the collections listing title",
    type: "textarea",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: "Explore our curated collections of premium bamboo products.",
    placeholder: "Explore our curated collections of premium bamboo products.",
  },
];

export const bambooCollectionsData = [...collectionsPageData];

export const bambooCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.listing",
    title: "Collections Listing Hero",
    description: "Collections index page hero (title, intro, image)",
    icon: "📝",
    columns: 2,
  },
];
