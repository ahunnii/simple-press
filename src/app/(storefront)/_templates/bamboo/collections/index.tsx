import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const collectionsPageData: TemplateField[] = [
  {
    key: "bamboo.collections.listing-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "Collections",
    placeholder: "Collections",
  },
  {
    key: "bamboo.collections.listing-title",
    label: "Heading",
    description: "Main heading at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: "Our Collections",
    placeholder: "Our Collections",
  },
  {
    key: "bamboo.collections.listing-intro",
    label: "Intro text",
    description: "Line below the heading. Leave blank for no text.",
    type: "textarea",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue: "Explore our curated collections of premium bamboo products.",
    placeholder: "Explore our curated collections.",
  },
];

export const bambooCollectionsData = [...collectionsPageData];

export const bambooCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.listing",
    title: "Collections page",
    description:
      "Heading and intro at the top of the collections index page.",
    icon: "📝",
    columns: 2,
  },
];
