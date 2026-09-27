import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const homepageHeroData: TemplateField[] = [
  {
    key: "modern.homepage.hero-image",
    label: "Hero photo",
    description: "Background photo behind the hero heading.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "modern.homepage.hero-title",
    label: "Heading",
    description: "Main heading in the hero.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Designed with modern in mind",
    placeholder: "e.g. Designed with modern in mind",
  },
  {
    key: "modern.homepage.hero-subtitle",
    label: "Intro text",
    description: "Short paragraph below the hero heading.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Well-chosen pieces that bring beauty to everyday life.",
    placeholder: "A sentence or two about what makes your products special.",
  },
  {
    key: "modern.homepage.hero-cta-button-text",
    label: "Button text",
    description: "Label on the main hero button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop All",
    placeholder: "e.g. Shop All",
  },
  {
    key: "modern.homepage.hero-cta-button-link",
    label: "Button link",
    description: "Where the hero button goes, e.g. /shop.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

const homepageValuesData: TemplateField[] = [
  {
    key: "modern.homepage.values-list",
    label: "Values",
    description:
      "Up to four short value statements shown under the hero. When left empty, three built-in statements are shown instead.",
    type: "list",
    page: "homepage",
    group: "homepage.values",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short value statement, e.g. Built to Last.",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "One short sentence supporting the title.",
      },
    ],
    minItems: 0,
    maxItems: 4,
    itemLabel: "Value",
    defaultsWhenEmpty: true,
  },
];

const homepageProductsData: TemplateField[] = [
  {
    key: "modern.homepage.products-tagline",
    label: "Small label",
    description: "Short label above the featured products heading.",
    type: "text",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-1",
    placeholder: "e.g. Curated Selection",
    defaultValue: "Curated Selection",
  },

  {
    key: "modern.homepage.products-title",
    label: "Heading",
    description: "Heading for the featured products section.",
    type: "text",
    page: "homepage",
    group: "homepage.products",
    defaultValue: "Featured Products",
    placeholder: "e.g. Featured Products",
    gridColumn: "col-span-1",
  },
  {
    key: "modern.homepage.products-link-text",
    label: "Link text",
    description: "Label for the link to the full shop, below the heading.",
    type: "text",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-1",
    placeholder: "e.g. View All Products",
    defaultValue: "View All Products",
  },
  {
    key: "modern.homepage.products-link-url",
    label: "Link URL",
    description: "Where the link goes, e.g. /shop.",
    type: "url",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-1",
    placeholder: "/shop",
    defaultValue: "/shop",
  },
];
const homepageAboutData: TemplateField[] = [
  {
    key: "modern.homepage.about-tagline",
    label: "Small label",
    description: "Short label above the about-teaser heading.",
    type: "text",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-full",
    defaultValue: "About Us",
    placeholder: "e.g. About Us",
  },
  {
    key: "modern.homepage.about-header",
    label: "Heading",
    description: "Heading for the about-teaser section.",
    type: "text",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-full",
    defaultValue: "Our Story",
    placeholder: "e.g. Our Story",
  },

  {
    key: "modern.homepage.about-text",
    label: "Body text",
    description: "Paragraph introducing your story, below the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-full",
    placeholder: "A sentence or two introducing your business and its story.",
    defaultValue:
      "We started with a simple goal: to offer pieces worth keeping. Every item in our collection is chosen for its quality, its beauty, and how well it fits into everyday life.",
  },
  {
    key: "modern.homepage.about-image",
    label: "Photo",
    description: "Photo beside the about-teaser text.",
    type: "image",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "modern.homepage.about-cta-button-text",
    label: "Button text",
    description: "Label on the button linking to the About page.",
    type: "text",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-1",
    defaultValue: "Learn More",
    placeholder: "e.g. Learn More",
  },
  {
    key: "modern.homepage.about-cta-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /about.",
    type: "url",
    page: "homepage",
    gridColumn: "col-span-1",
    group: "homepage.about",
    defaultValue: "/about",
    placeholder: "/about",
  },
];

export const modernHomepageData = [
  ...homepageHeroData,
  ...homepageValuesData,
  ...homepageProductsData,
  ...homepageAboutData,
];

export const modernHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description: "Photo and heading at the top of the homepage.",
    icon: "🎯",
    columns: 2,
  },

  {
    id: "homepage.values",
    title: "Values",
    description: "Short value statements shown under the hero.",
    icon: "💡",
    columns: 2,
  },
  {
    id: "homepage.products",
    title: "Featured products",
    description:
      "Grid of featured products below the hero, pulled from your catalog.",
    icon: "🛍️",
    columns: 1,
  },

  {
    id: "homepage.about",
    title: "About teaser",
    description: "Photo and short story linking to the About page.",
    icon: "📖",
    columns: 2,
  },
];

export const DEFAULT_MODERN_VALUES_LIST = [
  {
    title: "Care in Every Detail",
    description:
      "Every piece is chosen with attention to detail, from how it looks to how it feels in use.",
  },
  {
    title: "Thoughtfully Chosen",
    description:
      "We take our time choosing what we carry, so you can shop with confidence.",
  },
  {
    title: "Built to Last",
    description:
      "Quality construction means pieces you will love for years to come.",
  },
];
