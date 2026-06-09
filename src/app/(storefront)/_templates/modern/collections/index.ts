import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const collectionsPageData: TemplateField[] = [
  {
    key: "modern.collections.tagline",
    label: "Collections Tagline",
    description: "Tagline for the collections section",
    type: "text",
    page: "collections",
    defaultValue: "Shop",
    placeholder: "e.g. Shop",
  },
  {
    key: "modern.collections.title",
    label: "Collections Title",
    description: "Title for the collections section",
    type: "text",
    page: "collections",
    defaultValue: "Our Collections",
    placeholder: "e.g. Our Collections",
  },
  {
    key: "modern.collections.intro",
    label: "Collections Intro",
    description: "Intro for the collections section",
    type: "textarea",
    page: "collections",
    defaultValue:
      "Browse our curated collections, each assembled with care around a distinct theme or purpose.",
    placeholder:
      "e.g. Browse our curated collections, each assembled with care around a distinct theme or purpose.",
  },
];

export const modernCollectionsData = [...collectionsPageData];

export const modernCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.main",
    title: "Collections Main",
    description: "Main section for the collections page",
    icon: "📦",
    columns: 2,
  },
];
