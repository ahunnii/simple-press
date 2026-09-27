import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const heroData: TemplateField[] = [
  {
    key: "dark-trend.homepage.hero-image",
    label: "Hero image",
    description: "Full-width photo behind the headline at the top of the homepage.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dark-trend.homepage.hero-title",
    label: "Headline",
    description: "Main heading over the hero photo, at the top of the homepage.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Bold Designs. Built Different.",
    placeholder: "e.g. Style That Speaks For Itself",
  },
  {
    key: "dark-trend.homepage.hero-button-text",
    label: "Button text",
    description:
      "Label on the button in the hero. Leave blank, or clear the button link below, to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "e.g. Browse the shop",
  },
  {
    key: "dark-trend.homepage.hero-button-link",
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

const galleryData: TemplateField[] = [
  {
    key: "dark-trend.homepage.gallery",
    label: "Photo gallery",
    description:
      "Optional image gallery shown just below the hero. Leave unset to hide it.",
    type: "gallery",
    page: "homepage",
    group: "homepage.gallery",
  },
];

const firstSectionData: TemplateField[] = [
  {
    key: "dark-trend.first-section-title",
    label: "Heading",
    description:
      "Heading for the feature story section, also shown as large faded background text.",
    type: "text",
    page: "homepage",
    group: "homepage.first-section",
    defaultValue: "Crafted With Precision",
    placeholder: "e.g. Made By Hand",
  },
  {
    key: "dark-trend.first-section-image",
    label: "Image",
    description: "Photo shown beside the feature story text.",
    type: "image",
    page: "homepage",
    group: "homepage.first-section",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dark-trend.first-section-button-text",
    label: "Button text",
    description:
      "Label on the button in this section. Leave blank, or clear the button link below, to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.first-section",
    defaultValue: "Learn More",
    placeholder: "e.g. See how it's made",
  },
  {
    key: "dark-trend.first-section-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /about.",
    type: "url",
    page: "homepage",
    group: "homepage.first-section",
    defaultValue: "/about",
    placeholder: "/about",
  },
  {
    key: "dark-trend.first-section-description",
    label: "Body text",
    description: "Paragraph next to the image in the feature story section.",
    type: "textarea",
    page: "homepage",
    group: "homepage.first-section",
    defaultValue:
      "From concept to creation, every detail is handled with care. We bring bold ideas to life with craftsmanship that speaks for itself.",
    placeholder: "A short description for this section...",
  },
  {
    key: "dark-trend.first-section-subheader",
    label: "Subheading",
    description: "Secondary heading next to the icon, above the body text.",
    type: "text",
    page: "homepage",
    group: "homepage.first-section",
    defaultValue: "Our Craft",
    placeholder: "e.g. Handmade Details",
  },
];

const secondSectionData: TemplateField[] = [
  {
    key: "dark-trend.second-section-title",
    label: "Heading",
    description:
      "Heading for the featured product section, beside your first product.",
    type: "text",
    page: "homepage",
    group: "homepage.second-section",
    defaultValue: "New Arrivals",
    placeholder: "e.g. Just Dropped",
  },
  {
    key: "dark-trend.second-section-description",
    label: "Body text",
    description: "Paragraph under the heading in the featured product section.",
    type: "textarea",
    page: "homepage",
    group: "homepage.second-section",
    defaultValue:
      "Explore our latest drops — limited runs, bold designs, built to stand out.",
    placeholder: "A short description for this section...",
  },
  {
    key: "dark-trend.second-section-button-text",
    label: "Button text",
    description:
      "Button beside the featured product, linking to that product (or to the shop when there are no products yet). Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.second-section",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "e.g. View product",
  },
];

const productsData: TemplateField[] = [
  {
    key: "dark-trend.homepage.products-heading",
    label: "Heading",
    description:
      "Heading above the product grid on the homepage, also shown as the large faded text behind it.",
    type: "text",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-full",
    defaultValue: "Products",
    placeholder: "e.g. Shop the collection",
  },
  {
    key: "dark-trend.homepage.products-button-text",
    label: "Button text",
    description:
      "Button beside the heading that links to your full shop. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-1",
    defaultValue: "SHOP ALL PRODUCTS",
    placeholder: "e.g. See everything",
  },
  {
    key: "dark-trend.homepage.products-button-link",
    label: "Button link",
    description: "Where the button points. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop or a collection link",
  },
];

const ctaData: TemplateField[] = [
  {
    key: "dark-trend.cta-header",
    label: "Heading",
    description: "Heading in the closing banner at the bottom of the homepage.",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    defaultValue: "Ready to Make Something?",
    placeholder: "e.g. Let's build something together",
  },
  {
    key: "dark-trend.cta-description",
    label: "Body text",
    description: "Paragraph under the heading in the closing banner.",
    type: "textarea",
    page: "homepage",
    group: "homepage.cta",
    defaultValue:
      "Whether it's a custom order or something off the rack — we've got you covered.",
    placeholder: "A short invitation to shop or get in touch...",
  },
  {
    key: "dark-trend.cta-button-text",
    label: "Button text",
    description:
      "Label on the button in the closing banner. Leave blank, or clear the button link below, to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    defaultValue: "Get Started",
    placeholder: "e.g. Start your order",
  },
  {
    key: "dark-trend.cta-button-link",
    label: "Button link",
    description: "Where the closing-banner button goes, e.g. /contact.",
    type: "url",
    page: "homepage",
    group: "homepage.cta",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "dark-trend.cta-image",
    label: "Image",
    description: "Photo shown beside the closing banner text.",
    type: "image",
    page: "homepage",
    group: "homepage.cta",
    defaultValue: "/placeholder.svg",
  },
];

export const darkTrendHomepageData: TemplateField[] = [
  ...firstSectionData,
  ...secondSectionData,
  ...ctaData,
  ...galleryData,
  ...heroData,
  ...productsData,
];

export const darkTrendHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description: "Main banner area at the top of the homepage.",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.gallery",
    title: "Photo gallery",
    description: "Optional image gallery shown just below the hero.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "homepage.first-section",
    title: "Feature story",
    description:
      "Numbered story section with image, heading, subheading, description, and button.",
    icon: "🧵",
    columns: 2,
  },
  {
    id: "homepage.second-section",
    title: "Featured product",
    description:
      "Numbered spotlight section pairing your heading and description with your first product.",
    icon: "✨",
    columns: 2,
  },
  {
    id: "homepage.products",
    title: "Products",
    description:
      "Numbered product grid with a heading and a button to the full shop.",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "homepage.cta",
    title: "Closing banner",
    description:
      "Numbered banner at the bottom of the homepage with heading, description, button, and image.",
    icon: "📣",
    columns: 2,
  },
];
