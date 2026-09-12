import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// ─── CollectionsPage: Hero ─────────────────────────────────────────────────
// The index page has exactly one field group: the heading block plus the
// ghost-card copy shown when no collections are published yet. The grid of
// published collections itself is data-driven and carries no fields of its
// own.

export const oliveCollectionsData: TemplateField[] = [
  {
    key: "olive.collections.hero-heading",
    label: "Hero Heading",
    description: "Page title at the top of the collections index.",
    type: "text",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue: "Collections",
  },
  {
    key: "olive.collections.hero-body",
    label: "Hero Body",
    description: "One line under the heading, above the grid of collections.",
    type: "textarea",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-full",
    defaultValue: "The whole shop, sorted by mood.",
  },
  {
    key: "olive.collections.empty-heading",
    label: "Empty Collections Heading",
    description:
      "Shown on the ghost card when the shop has no published collections yet.",
    type: "text",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue: "Nothing to show yet.",
  },
  {
    key: "olive.collections.empty-body",
    label: "Empty Collections Text",
    description: "One line under the empty-collections heading.",
    type: "textarea",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "New collections will appear here as soon as they're published.",
  },
];

export const oliveCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.hero",
    title: "Collections Hero",
    description:
      "Page heading and body line above the grid of published collections, plus the empty-shelf message",
    icon: "🗂️",
    columns: 1,
  },
];

export const oliveCollectionsSections: TemplateSection[] = [
  {
    id: "collections.hero",
    page: "collections",
    title: "Hero",
    description: "Page heading, body line, and the grid of collections",
    groupIds: ["collections.hero"],
    order: 0,
    hideable: false,
  },
];
