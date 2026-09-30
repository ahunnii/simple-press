import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const aboutFeaturesData: TemplateField[] = [
  {
    key: "dark-trend.about.first-image",
    label: "Image",
    description: "Photo beside the story heading and cards.",
    type: "image",
    page: "about",
    defaultValue: "/placeholder.svg",
    group: "about.features",
  },

  {
    key: "dark-trend.about.subheader",
    label: "Small label",
    description: "Short text above the heading.",
    type: "text",
    page: "about",
    defaultValue: "Our Story",
    group: "about.features",
    placeholder: "e.g. Who we are",
  },
  {
    key: "dark-trend.about.header",
    label: "Heading",
    description: "Heading for the story section on the about page.",
    type: "text",
    page: "about",
    defaultValue: "About Us",
    placeholder: "e.g. Meet the makers",
    group: "about.features",
  },

  {
    key: "dark-trend.about.button",
    label: "Button text",
    description:
      "Label on the button under the cards. Leave blank, or clear the button link below, to hide the button.",
    type: "text",
    page: "about",
    defaultValue: "Learn More",
    placeholder: "e.g. See our products",
    group: "about.features",
  },
  {
    key: "dark-trend.about.button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /shop.",
    type: "url",
    page: "about",
    defaultValue: "/shop",
    placeholder: "/shop",
    group: "about.features",
  },
  {
    key: "dark-trend.about.features-list",
    label: "Cards",
    description:
      "Numbered cards under the heading, each with a title and a short description. Leave empty to show three built-in cards.",
    type: "list",
    page: "about",
    group: "about.features",
    gridColumn: "col-span-full",
    itemLabel: "card",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading.",
        placeholder: "e.g. What we make",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "One or two sentences under the card heading.",
        placeholder: "A sentence or two about this point",
      },
    ],
    minItems: 0,
    maxItems: 4,
  },
];

const aboutCTAData: TemplateField[] = [
  {
    key: "dark-trend.about.second-image",
    label: "Image",
    description: "Photo beside the closing banner text on the about page.",
    type: "image",
    page: "about",
    defaultValue: "/placeholder.svg",
    group: "about.cta",
  },
  {
    key: "dark-trend.about.cta-header",
    label: "Heading",
    description: "Heading in the closing banner at the bottom of the about page.",
    type: "text",
    page: "about",
    group: "about.cta",
    defaultValue: "Ready to Work Together?",
    placeholder: "e.g. Let's get started",
  },
  {
    key: "dark-trend.about.cta-description",
    label: "Body text",
    description: "Paragraph under the heading in the closing banner.",
    type: "textarea",
    page: "about",
    group: "about.cta",
    defaultValue:
      "Let's create something extraordinary together. Reach out and we'll make it happen.",
    placeholder: "A short invitation to shop or get in touch...",
  },
  {
    key: "dark-trend.about.cta-button-text",
    label: "Button text",
    description:
      "Label on the button in the closing banner. Leave blank, or clear the button link below, to hide the button.",
    type: "text",
    page: "about",
    group: "about.cta",
    defaultValue: "Get Started",
    placeholder: "e.g. Say hello",
  },
  {
    key: "dark-trend.about.cta-button-link",
    label: "Button link",
    description: "Where the closing-banner button goes, e.g. /contact.",
    type: "url",
    page: "about",
    group: "about.cta",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

export const aboutDarkTrendPageData: TemplateField[] = [
  ...aboutFeaturesData,
  ...aboutCTAData,
];

export const aboutDarkTrendFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.features",
    title: "Story",
    description:
      "Image, heading, numbered cards, and button at the top of the about page.",
    icon: "✨",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "Closing banner",
    description:
      "Banner at the bottom of the about page with heading, description, button, and image.",
    icon: "✨",
    columns: 2,
  },
];

/**
 * Built-in about-page cards, shown when the owner hasn't saved any cards
 * (and has no legacy `feature-N-*` values — see `resolveDarkTrendAboutFeatures`
 * in `./dark-trend-about-features.ts`). Deliberately neutral so they suit any
 * small shop without the owner editing them first.
 */
export const DEFAULT_DARK_TREND_FEATURES: {
  title: string;
  description: string;
}[] = [
  {
    title: "What We Make",
    description:
      "Products we're proud of, designed with care and made to be used and loved every day.",
  },
  {
    title: "How We Make It",
    description:
      "We sweat the details, from the materials we choose to the way each order is packed and sent out.",
  },
  {
    title: "Why Shop With Us",
    description:
      "Real people behind every order, friendly help whenever you need it, and products that live up to their photos.",
  },
];
