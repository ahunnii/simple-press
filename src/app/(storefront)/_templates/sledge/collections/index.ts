import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Collections Page ──────────────────────────────────────────────────────────

const collectionsListingData: TemplateField[] = [
  {
    key: "sledge.collections.heading",
    label: "Heading",
    description: "Main heading at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "All Collections",
  },
  {
    key: "sledge.collections.intro",
    label: "Intro text",
    description: "Line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-full",
    defaultValue:
      "Browse curated groupings of one-of-a-kind pieces from the studio.",
  },
];

export const sledgeCollectionsData = [...collectionsListingData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const sledgeCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.listing",
    title: "Collections page",
    description:
      "Heading and intro at the top of the collections index page.",
    icon: "🗂️",
    columns: 2,
  },
];
