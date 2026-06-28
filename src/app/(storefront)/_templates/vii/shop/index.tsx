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
    description:
      "Small caps label above the collections strip at the bottom of the shop page.",
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

// ─── Shop: Beyond the Catalog (promo band + brands toggle) ──────────────────

const shopBeyondData: TemplateField[] = [
  // Left / navy half — gift cards
  {
    key: "vii.shop.promo-left-overline",
    label: "Left Panel Overline",
    description:
      "Small caps label above the heading in the navy (gift cards) panel.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Gift Cards",
  },
  {
    key: "vii.shop.promo-left-heading",
    label: "Left Panel Heading",
    description:
      'Plain heading text for the navy panel (e.g. "Give the gift of"). Pairs with the accent word.',
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Give the gift of",
  },
  {
    key: "vii.shop.promo-left-accent",
    label: "Left Panel Accent Word",
    description:
      'Italic copper-light accent word completing the navy panel heading (e.g. "ritual").',
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "ritual",
  },
  {
    key: "vii.shop.promo-left-body",
    label: "Left Panel Body",
    description:
      "Short supporting copy for the navy (gift cards) panel. One to two sentences.",
    type: "textarea",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-full",
    defaultValue:
      "Share the sanctuary experience with someone you love. A Skinbar VII gift card is the perfect way to give the gift of calm.",
  },
  {
    key: "vii.shop.promo-left-image",
    label: "Left Panel Image",
    description:
      "Optional small decorative or brand image shown above the heading in the navy panel.",
    type: "image",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii.shop.promo-left-button-label",
    label: "Left Panel Button Label",
    description:
      'CTA button label for the navy panel (e.g. "Buy a gift card").',
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Buy a gift card",
  },
  {
    key: "vii.shop.promo-left-button-link",
    label: "Left Panel Button Link",
    description: 'Destination URL for the navy panel CTA (e.g. "/gift-cards").',
    type: "url",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "/gift-cards",
  },

  // Right / cream half — haircare
  {
    key: "vii.shop.promo-right-overline",
    label: "Right Panel Overline",
    description:
      "Small caps label above the heading in the cream (haircare) panel.",
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Haircare",
  },
  {
    key: "vii.shop.promo-right-heading",
    label: "Right Panel Heading",
    description:
      'Plain heading text for the cream panel (e.g. "The products we"). Pairs with the accent word.',
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "The products we",
  },
  {
    key: "vii.shop.promo-right-accent",
    label: "Right Panel Accent Word",
    description:
      'Italic copper accent word completing the cream panel heading (e.g. "trust").',
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "trust",
  },
  {
    key: "vii.shop.promo-right-body",
    label: "Right Panel Body",
    description:
      "Short supporting copy for the cream (haircare) panel. One to two sentences.",
    type: "textarea",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-full",
    defaultValue:
      "Thoughtfully selected for every hair type. The brands on our shelves are the ones our stylists reach for every day.",
  },
  {
    key: "vii.shop.promo-right-image",
    label: "Right Panel Logo",
    description:
      "Optional brand logo shown above the heading in the cream panel. Displayed at roughly 40–64px tall with auto width.",
    type: "image",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii.shop.promo-right-button-label",
    label: "Right Panel Button Label",
    description: 'CTA button label for the cream panel (e.g. "Shop haircare").',
    type: "text",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "Shop haircare",
  },
  {
    key: "vii.shop.promo-right-button-link",
    label: "Right Panel Button Link",
    description:
      "Destination URL for the cream panel CTA. Leave blank to hide the button.",
    type: "url",
    page: "shop",
    group: "shop.beyond",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Brands marquee toggle
  {
    key: "vii.shop.show-brands",
    label: "Show 'Brands We Carry' Marquee",
    description:
      "When enabled, shows the brands marquee section at the bottom of the shop page. Logo images are reused from the homepage Brands fields — configure them under the Homepage settings.",
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
    title: "Shop Page",
    description:
      "Editorial intro (overline, heading, body) and the collections strip shown on the shop page",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "shop.beyond",
    title: "Beyond the Catalog",
    description:
      "Dual-color promo band shown below the product grid — a navy panel (e.g. gift cards) and a cream panel (e.g. haircare). Also controls the brands marquee at the bottom of the page.",
    icon: "✦",
    columns: 2,
  },
];
