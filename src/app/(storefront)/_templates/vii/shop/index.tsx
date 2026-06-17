import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Shop: Intro ────────────────────────────────────────────────────────────

const shopIntroData: TemplateField[] = [
  {
    key: "vii.shop.intro-overline",
    label: "Shop Overline",
    description: "Small caps label above the shop heading.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Catalog",
  },
  {
    key: "vii.shop.intro-heading",
    label: "Shop Heading",
    description:
      "The plain part of the shop heading (e.g. 'Discover'). Pairs with the accent word.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Discover",
  },
  {
    key: "vii.shop.intro-accent",
    label: "Shop Heading Accent Word",
    description:
      "The italic copper accent word completing the shop heading (e.g. 'our edit').",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "our edit",
  },
  {
    key: "vii.shop.intro-body",
    label: "Shop Intro Text",
    description:
      "Short paragraph beneath the shop heading introducing your products.",
    type: "textarea",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-full",
    defaultValue:
      "Browse our products, carefully curated to help you live a happier, healthier life.",
  },
  {
    key: "vii.shop.collections-overline",
    label: "Collections Strip Overline",
    description: "Small caps label above the collections strip at the bottom of the shop page.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Explore",
  },
  {
    key: "vii.shop.collections-heading",
    label: "Collections Strip Heading",
    description:
      "Heading for the collections strip at the bottom of the shop page. Leave blank to hide the strip.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Shop by collection",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const viiShopData: TemplateField[] = [...shopIntroData];

export const viiShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.intro",
    title: "Shop Page",
    description:
      "Editorial intro (overline, heading, body) and the collections strip shown on the shop page",
    icon: "🛍️",
    columns: 2,
  },
];
