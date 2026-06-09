import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const aboutFeaturesData: TemplateField[] = [
  {
    key: "dark-trend.about.first-image",
    label: "About First Image",
    description: "Image for the first section of the about page",
    type: "image",
    page: "about",
    defaultValue: "/placeholder.svg",
    group: "about.features",
  },

  {
    key: "dark-trend.about.subheader",
    label: "About Subheader",
    description: "Subheader for the about page",
    type: "text",
    page: "about",
    defaultValue: "Our Story",
    group: "about.features",
    placeholder: "Our Story",
  },
  {
    key: "dark-trend.about.header",
    label: "About Header",
    description: "Header for the about page",
    type: "text",
    page: "about",
    defaultValue: "About Us",
    placeholder: "About Us",
    group: "about.features",
  },

  {
    key: "dark-trend.about.button",
    label: "About Button",
    description: "Button for the about page",
    type: "text",
    page: "about",
    defaultValue: "Learn More",
    placeholder: "Learn More",
    group: "about.features",
  },
  {
    key: "dark-trend.about.button-link",
    label: "About Button Link",
    description: "Button link for the about page",
    type: "url",
    page: "about",
    defaultValue: "/shop",
    placeholder: "/shop",
    group: "about.features",
  },
  {
    key: "dark-trend.about.features-list",
    label: "Features List",
    description:
      "Cards for the Features section (icon, title, and description per item).",
    type: "list",
    page: "about",
    group: "about.features",
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

const aboutCTAData: TemplateField[] = [
  {
    key: "dark-trend.about.second-image",
    label: "About Second Image",
    description: "Image for the second section of the about page",
    type: "image",
    page: "about",
    defaultValue: "/placeholder.svg",
    group: "about.cta",
  },
  {
    key: "dark-trend.about.cta-header",
    label: "About CTA Header",
    description: "CTA header for the about page",
    type: "text",
    page: "about",
    group: "about.cta",
    defaultValue: "Ready to Work Together?",
    placeholder: "e.g. Ready to Work Together?",
  },
  {
    key: "dark-trend.about.cta-description",
    label: "About CTA Description",
    description: "CTA description for the about page",
    type: "textarea",
    page: "about",
    group: "about.cta",
    defaultValue:
      "Let's create something extraordinary together. Reach out and we'll make it happen.",
    placeholder: "A short invitation to shop or get in touch...",
  },
  {
    key: "dark-trend.about.cta-button-text",
    label: "About CTA Button Text",
    description: "CTA button text for the about page",
    type: "text",
    page: "about",
    group: "about.cta",
    defaultValue: "Get Started",
    placeholder: "Get Started",
  },
  {
    key: "dark-trend.about.cta-button-link",
    label: "About CTA Button Link",
    description: "CTA button link for the about page",
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
    title: "Features Section",
    description: "Features for the about page",
    icon: "✨",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "CTA Section",
    description: "CTA for the about page",
    icon: "✨",
    columns: 2,
  },
];

export const DEFAULT_DARK_TREND_FEATURES: {
  title: string;
  description: string;
}[] = [
  {
    title: "Our Mission",
    description:
      "Creating alternative clothing that celebrates individuality and empowers Black, LGBTQ+, and POC communities to express their unique identities.",
  },
  {
    title: "Our Values",
    description:
      "We value diversity, creativity, and community, ensuring our designs resonate with underrepresented voices and foster a safe, inclusive shopping environment for everyone.",
  },
  {
    title: "Why Us?",
    description:
      "We don't just make you look beautiful, handsome, and gear to show off, we'll make you feel like the coolest!",
  },
];
