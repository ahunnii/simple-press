import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const collectionsPageData: TemplateField[] = [
  {
    key: "pollen.collections.page-title",
    label: "Page Title",
    description: "Main heading shown in the collections page hero",
    type: "text",
    page: "collections",
    group: "collections.main",
    gridColumn: "col-span-1",
    defaultValue: "Our Collections",
    placeholder: "Our Collections",
  },
  {
    key: "pollen.collections.page-subtitle",
    label: "Page Subtitle",
    description: "Small label shown above the page title in the hero",
    type: "text",
    page: "collections",
    group: "collections.main",
    gridColumn: "col-span-1",
    defaultValue: "Collections",
    placeholder: "Collections",
  },
  {
    key: "pollen.collections.listing-intro",
    label: "Collections Page Intro",
    description: "Short intro shown below the hero on the collections listing page",
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
    title: "Collections Page",
    description: "Heading and intro text for the collections listing page",
    icon: "📦",
    columns: 2,
  },
];
