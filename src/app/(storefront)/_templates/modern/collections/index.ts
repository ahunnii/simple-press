import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const collectionsPageData: TemplateField[] = [
  {
    key: "modern.collections.tagline",
    label: "Small label",
    description:
      "Short label above the heading at the top of the Collections page.",
    type: "text",
    page: "collections",
    group: "collections.main",
    defaultValue: "Shop",
    placeholder: "e.g. Shop",
  },
  {
    key: "modern.collections.title",
    label: "Heading",
    description: "Main heading at the top of the Collections page.",
    type: "text",
    page: "collections",
    group: "collections.main",
    defaultValue: "Our Collections",
    placeholder: "e.g. Our Collections",
  },
  {
    key: "modern.collections.intro",
    label: "Intro text",
    description: "Short paragraph below the heading.",
    type: "textarea",
    page: "collections",
    group: "collections.main",
    defaultValue:
      "Browse our curated collections, each assembled with care around a distinct theme or purpose.",
    placeholder:
      "A sentence or two describing how your collections are organized.",
  },
];

export const modernCollectionsData = [...collectionsPageData];

export const modernCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.main",
    title: "Intro",
    description: "Small label, heading, and intro above the collections grid.",
    icon: "📦",
    columns: 2,
  },
];
