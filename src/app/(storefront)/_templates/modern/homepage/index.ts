import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const homepageHeroData: TemplateField[] = [
  {
    key: "modern.homepage.hero-image",
    label: "Hero Image",
    description: "Image for the hero section",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "modern.homepage.hero-title",
    label: "Hero Title",
    description: "Title for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Designed with modern in mind",
    placeholder: "Designed with modern in mind",
  },
  {
    key: "modern.homepage.hero-subtitle",
    label: "Hero Subtitle",
    description: "Subtitle for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Thoughtfully crafted goods that blend beauty with everyday function.",
    placeholder:
      "Thoughtfully crafted goods that blend beauty with everyday function.",
  },
  {
    key: "modern.homepage.hero-cta-button-text",
    label: "Hero CTA Button Text",
    description: "Button text for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop All",
    placeholder: "Shop All",
  },
  {
    key: "modern.homepage.hero-cta-button-link",
    label: "Hero CTA Button Link",
    description: "Button link for the hero section",
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
    label: "Values Cards",
    description:
      "Cards for the Values section (title, and description per item).",
    type: "list",
    page: "homepage",
    group: "homepage.values",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text",
      },
    ],
    minItems: 0,
    maxItems: 4,
  },
];

const homepageProductsData: TemplateField[] = [
  {
    key: "modern.homepage.products-tagline",
    label: "Products Tagline",
    description: "Tagline for the products section",
    type: "text",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-1",
    placeholder: "e.g. Curated Selection",
    defaultValue: "Curated Selection",
  },

  {
    key: "modern.homepage.products-title",
    label: "Products Title",
    description: "Title for the products section",
    type: "text",
    page: "homepage",
    group: "homepage.products",
    defaultValue: "Featured Products",
    placeholder: "e.g. Featured Products",
    gridColumn: "col-span-1",
  },
  {
    key: "modern.homepage.products-link-text",
    label: "Products Link Text",
    description: "Link text for the products section",
    type: "text",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-1",
    placeholder: "e.g. View All Products",
    defaultValue: "View All Products",
  },
  {
    key: "modern.homepage.products-link-url",
    label: "Products Link URL",
    description: "Link URL for the products section",
    type: "url",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-1",
    placeholder: "e.g. /shop",
    defaultValue: "/shop",
  },
];
const homepageAboutData: TemplateField[] = [
  {
    key: "modern.homepage.about-header",
    label: "About Header",
    description: "Title for the about section",
    type: "text",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-1",
    defaultValue: "Our Story",
    placeholder: "e.g. Our Story",
  },
  {
    key: "modern.homepage.about-tagline",
    label: "About Tagline",
    description: "Subtitle for the about section",
    type: "text",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
    placeholder: "e.g. About Us",
  },
  {
    key: "modern.homepage.about-text",
    label: "About Text",
    description: "Text for the about section",
    type: "textarea",
    page: "homepage",
    group: "homepage.about",
    placeholder: "e.g. We work directly with artisans from around the world...",
    defaultValue:
      "We work directly with artisans from around the world to bring you pieces that tell a story. Every item in our collection is chosen for its quality, beauty, and the hands that made it.",
  },
  {
    key: "modern.homepage.about-image",
    label: "About Image",
    description: "Image for the about section",
    type: "image",
    page: "homepage",
    group: "homepage.about",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "modern.homepage.about-cta-button-text",
    label: "About CTA Button Text",
    description: "Button text for the about cta section",
    type: "text",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-1",
    defaultValue: "Learn More",
    placeholder: "e.g. Learn More",
  },
  {
    key: "modern.homepage.about-cta-button-link",
    label: "About CTA Button Link",
    description: "Button link for the about cta section",
    type: "url",
    page: "homepage",
    gridColumn: "col-span-1",
    group: "homepage.about",
    defaultValue: "/about",
    placeholder: "e.g. /about",
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
    title: "Hero Section",
    description: "Main banner area at the top of homepage",
    icon: "🎯",
    columns: 2,
  },

  {
    id: "homepage.features",
    title: "Values Section",
    description: "What sets your business apart?",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.products",
    title: "Featured Products Section",
    description: "Featured products section after the hero section",
    icon: "🎯",
    columns: 1,
  },

  {
    id: "homepage.services",
    title: "Services Section",
    description: "Services section after the hero section",
    icon: "🎯",
    columns: 1,
  },

  {
    id: "homepage.about",
    title: "About Section",
    description: "About section on the homepage",
    icon: "🎯",
    columns: 2,
  },
];

export const DEFAULT_MODERN_VALUES_LIST = [
  {
    title: "Crafted With Care",
    description:
      "Every piece is made by skilled artisans using time-honored techniques.",
  },
  {
    title: "Sustainably Made",
    description:
      "We source responsibly and prioritize natural, sustainable materials.",
  },
  {
    title: "Built to Last",
    description:
      "Quality construction means pieces you will love for years to come.",
  },
];
