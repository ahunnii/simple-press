import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// design.md → "Per-page section concepts → Collections · Collection": the
// Collections index has one field group (hero + a single shared empty-state
// line, used by both the index and the data-driven CollectionPage — which
// otherwise carries no fields of its own).

const collectionsHeroData: TemplateField[] = [
  {
    key: "umsc.collections.hero-heading",
    label: "Collections Heading",
    description:
      "Headline in the black page-hero band at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop by collection.",
  },
  {
    key: "umsc.collections.hero-lede",
    label: "Collections Lede",
    description: "One sentence beneath the collections heading.",
    type: "textarea",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "Candles, soaps, body care, and home care — grouped the way you shop.",
  },
  {
    key: "umsc.collections.empty-body",
    label: "Empty State Text",
    description:
      "Shown when there are no published collections to list, and when a single collection has no products in it yet.",
    type: "textarea",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-full",
    defaultValue: "Nothing to show here yet — explore the full shop instead.",
  },
];

export const umscCollectionsData: TemplateField[] = [...collectionsHeroData];

export const umscCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.hero",
    title: "Collections Page",
    description:
      "Heading, lede, and the shared empty-state line used by both the collections index and a single collection page",
    icon: "🗂️",
    columns: 2,
  },
];

export const umscCollectionsSections: TemplateSection[] = [
  {
    id: "collections.hero",
    page: "collections",
    title: "Hero",
    description:
      "Black page-hero band with heading and lede, above the collections grid",
    groupIds: ["collections.hero"],
    order: 0,
    hideable: false,
  },
];
