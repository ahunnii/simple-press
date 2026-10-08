import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

// ─── Collections index: navy band + circle cards ───────────────────────────

const heroData: TemplateField[] = [
  {
    key: "glove.collections.heading",
    label: "Heading",
    description:
      "The page title in the band at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue: "Collections",
  },
  {
    key: "glove.collections.intro",
    label: "Intro line",
    description:
      "One line under the heading in the title band. Leave blank to hide.",
    type: "textarea",
    page: "collections",
    group: "collections.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Gloves, chains and charms, made to be given.",
  },
];

const gridData: TemplateField[] = [
  {
    key: "glove.collections.button-label",
    label: "Card button",
    description: "Small button under each collection's name.",
    type: "text",
    page: "collections",
    group: "collections.grid",
    gridColumn: "col-span-1",
    defaultValue: "Shop",
  },
  {
    key: "glove.collections.empty-heading",
    label: "No collections heading",
    description: "Shown in place of the cards when no collection is published.",
    type: "text",
    page: "collections",
    group: "collections.grid",
    gridColumn: "col-span-1",
    defaultValue: "Our collections are being curated",
  },
  {
    key: "glove.collections.empty-body",
    label: "No collections text",
    description: "One line under the no-collections heading.",
    type: "textarea",
    page: "collections",
    group: "collections.grid",
    gridColumn: "col-span-1",
    defaultValue:
      "In the meantime, every glove, chain and charm is waiting in the shop.",
  },
  {
    key: "glove.collections.empty-button-label",
    label: "No collections button",
    description:
      "Button under the no-collections text, linking to the shop. Leave blank to hide.",
    type: "text",
    page: "collections",
    group: "collections.grid",
    gridColumn: "col-span-1",
    defaultValue: "Browse the shop",
  },
];

// ─── Single collection page (shared by every collection) ───────────────────

const detailData: TemplateField[] = [
  {
    key: "glove.collections.load-more-label",
    label: "Load more button",
    description:
      "Button under a collection's products that shows the next ones. Hidden when everything is already showing.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Load more products",
  },
  {
    key: "glove.collections.detail-empty-heading",
    label: "Empty collection heading",
    description: "Shown when a collection has no published products yet.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Nothing in this collection just yet",
  },
  {
    key: "glove.collections.detail-empty-body",
    label: "Empty collection text",
    description: "One line under the empty-collection heading.",
    type: "textarea",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue:
      "New pieces are being made with love. Browse the rest of the shop while you wait.",
  },
  {
    key: "glove.collections.no-results-heading",
    label: "No matches heading",
    description: "Shown when a search inside a collection matches nothing.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "No products match that search",
  },
  {
    key: "glove.collections.no-results-body",
    label: "No matches text",
    description: "One line under the no-matches heading.",
    type: "textarea",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "Clear the search to see everything in this collection.",
  },
  {
    key: "glove.collections.more-heading",
    label: "More collections heading",
    description:
      "Heading over the other collections at the bottom of a collection. Leave blank to hide that row.",
    type: "text",
    page: "collections",
    group: "collections.detail",
    gridColumn: "col-span-1",
    defaultValue: "More Collections",
  },
];

export const gloveCollectionsData: TemplateField[] = [
  ...heroData,
  ...gridData,
  ...detailData,
];

export const gloveCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.hero",
    title: "Collections title",
    description: "Heading and intro line in the band at the top",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "collections.grid",
    title: "Collection cards",
    description:
      "Button on each collection card and the message shown when none are published",
    icon: "🧤",
    columns: 2,
  },
  {
    id: "collections.detail",
    title: "Single collection",
    description:
      "Load more button, empty messages and the more-collections row on every collection page",
    icon: "📂",
    columns: 2,
  },
];

export const gloveCollectionsSections: TemplateSection[] = [
  {
    id: "collections.hero",
    page: "collections",
    title: "Collections title",
    description: "Title band at the top of the collections page",
    groupIds: ["collections.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "collections.grid",
    page: "collections",
    title: "Collection cards",
    description:
      "A circle card for every published collection. Collections come from Products → Collections.",
    groupIds: ["collections.grid"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.collections],
  },
  {
    id: "collections.detail",
    page: "collections",
    title: "Single collection",
    description:
      "Every collection page: product grid, load more, empty messages and more collections",
    groupIds: ["collections.detail"],
    order: 2,
    hideable: false,
    links: [SECTION_LINKS.collections],
  },
];
