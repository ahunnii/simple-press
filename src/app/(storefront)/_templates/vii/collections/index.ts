import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Collections index page fields (`/collections`) — page "collections",
 * group "collections.listing". Consumed by `ViiCollectionsPage`.
 */
export const viiCollectionsData: TemplateField[] = [
  {
    key: "vii.collections.overline",
    label: "Small label",
    description:
      "Small label above the heading, at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "Shop by collection",
    placeholder: "Shop by collection",
  },
  {
    key: "vii.collections.heading",
    label: "Heading",
    description: "Main heading at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "Our",
    placeholder: "Our",
  },
  {
    key: "vii.collections.heading-accent",
    label: "Heading, highlighted words",
    description:
      "Shown in italics right after the heading, at the top of the collections page.",
    type: "text",
    page: "collections",
    group: "collections.listing",
    gridColumn: "col-span-1",
    defaultValue: "collections",
    placeholder: "collections",
  },
];

export const viiCollectionsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "collections.listing",
    title: "Collections page",
    description: "Heading at the top of the collections page.",
    icon: "🗂️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
