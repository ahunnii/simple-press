import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const collectionsPageData: TemplateField[] = [
  {
    key: "pollen.collections.page-title",
    label: "Page title",
    description: "Main heading shown at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.main",
    gridColumn: "col-span-1",
    defaultValue: "Our Collections",
    placeholder: "Our Collections",
  },
  {
    key: "pollen.collections.page-subtitle",
    label: "Page subtitle",
    description: "Small label shown above the page title.",
    type: "text",
    page: "collections",
    group: "collections.main",
    gridColumn: "col-span-1",
    defaultValue: "Collections",
    placeholder: "Collections",
  },
  {
    key: "pollen.collections.listing-intro",
    label: "Intro text",
    description: "Short line below the page title.",
    type: "textarea",
    page: "collections",
    group: "collections.main",
    gridColumn: "col-span-full",
    defaultValue: "Browse our curated collections.",
    placeholder: "Browse our curated collections...",
  },
];

export const pollenCollectionsData = [...collectionsPageData];

export const pollenCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.main",
    title: "Collections",
    description: "Heading and intro text at the top of the collections page.",
    icon: "📦",
    columns: 2,
  },
];
