import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Shop page ──────────────────────────────────────────────────────────────

const shopIntroData: TemplateField[] = [
  {
    key: "vii.shop.intro-overline",
    label: "Small label",
    description: "Small label above the shop heading.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Catalog",
  },
  {
    key: "vii.shop.intro-heading",
    label: "Heading",
    description:
      "The plain part of the shop heading (e.g. 'Discover'). Pairs with the highlighted words.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Discover",
  },
  {
    key: "vii.shop.intro-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "our edit",
  },
  {
    key: "vii.shop.intro-body",
    label: "Body text",
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
    label: "Small label",
    description:
      "Small label above the collections strip at the bottom of the shop page.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Explore",
  },
  {
    key: "vii.shop.collections-heading",
    label: "Collections strip heading",
    description:
      "Heading for the collections strip at the bottom of the shop page. Leave blank to hide the strip.",
    type: "text",
    page: "shop",
    group: "shop.intro",
    gridColumn: "col-span-1",
    defaultValue: "Shop by collection",
  },
];

// ─── Promo panels ────────────────────────────────────────────────────────────

const shopBeyondData: TemplateField[] = [
  // First panel — e.g. gift cards
  {
    key: "vii.shop.promo-left-overline",
    label: "First panel: small label",
    description: "Small label above the heading in the first promo panel.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Gift Cards",
  },
  {
    key: "vii.shop.promo-left-heading",
    label: "First panel: heading",
    description:
      "Plain heading text for the first panel (e.g. 'Give the gift of'). Pairs with the highlighted words.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Give the gift of",
  },
  {
    key: "vii.shop.promo-left-accent",
    label: "First panel: heading, highlighted words",
    description: "Shown in italics after the first panel's heading.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "ritual",
  },
  {
    key: "vii.shop.promo-left-body",
    label: "First panel: body text",
    description:
      "Short supporting copy for the first panel. One to two sentences.",
    type: "textarea",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-full",
    defaultValue:
      "Share the sanctuary experience with someone you love. A Skinbar VII gift card is the perfect way to give the gift of calm.",
  },
  {
    key: "vii.shop.promo-left-image",
    label: "First panel: photo",
    description:
      "Optional small decorative or brand photo shown above the heading in the first panel. Leave blank to hide it.",
    type: "image",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii.shop.promo-left-button-label",
    label: "First panel: button text",
    description:
      "Button text for the first panel (e.g. 'Buy a gift card'). Both this and the button link must be set for the button to appear.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Buy a gift card",
  },
  {
    key: "vii.shop.promo-left-button-link",
    label: "First panel: button link",
    description:
      "Where the first panel's button sends visitors (e.g. '/gift-cards').",
    type: "url",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "/gift-cards",
  },

  // Second panel — e.g. haircare
  {
    key: "vii.shop.promo-right-overline",
    label: "Second panel: small label",
    description: "Small label above the heading in the second promo panel.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Haircare",
  },
  {
    key: "vii.shop.promo-right-heading",
    label: "Second panel: heading",
    description:
      "Plain heading text for the second panel (e.g. 'The products we'). Pairs with the highlighted words.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "The products we",
  },
  {
    key: "vii.shop.promo-right-accent",
    label: "Second panel: heading, highlighted words",
    description: "Shown in italics after the second panel's heading.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "trust",
  },
  {
    key: "vii.shop.promo-right-body",
    label: "Second panel: body text",
    description:
      "Short supporting copy for the second panel. One to two sentences.",
    type: "textarea",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-full",
    defaultValue:
      "Thoughtfully selected for every hair type. The brands on our shelves are the ones our stylists reach for every day.",
  },
  {
    key: "vii.shop.promo-right-image",
    label: "Second panel: logo",
    description:
      "Optional brand logo shown above the heading in the second panel. Displayed at roughly 40–64px tall with auto width. Leave blank to hide it.",
    type: "image",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii.shop.promo-right-button-label",
    label: "Second panel: button text",
    description:
      "Button text for the second panel (e.g. 'Shop haircare'). Both this and the button link must be set for the button to appear.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Shop haircare",
  },
  {
    key: "vii.shop.promo-right-button-link",
    label: "Second panel: button link",
    description:
      "Where the second panel's button sends visitors. Leave blank to hide the button.",
    type: "url",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Brands marquee toggle
  {
    key: "vii.shop.show-brands",
    label: "Show brand logos",
    description:
      "When on, shows a row of brand logos at the bottom of the shop page. The logos are reused from the homepage Brands field — configure them under the Homepage settings.",
    type: "boolean",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-full",
    defaultValue: "false",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const viiShopData: TemplateField[] = [
  ...shopIntroData,
  ...shopBeyondData,
];

export const viiShopFieldGroups: TemplateFieldGroup[] = [
  {
    id: "shop.intro",
    title: "Shop page",
    description:
      "Editorial intro (small label, heading, body) and the collections strip shown on the shop page",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "shop.beyond",
    title: "Promo panels",
    description:
      "Two-panel promo band shown below the product grid — e.g. one panel for gift cards and one for a featured category. Also controls the brand logos at the bottom of the page.",
    icon: "✦",
    columns: 2,
  },
];
