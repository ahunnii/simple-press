import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { aboutDarkTrendFieldGroups, aboutDarkTrendPageData } from "./about";
import { darkTrendBlogData, darkTrendBlogFieldGroups } from "./blog";

const homepageData: TemplateField[] = [
  {
    key: "dark-trend.first-section-title",
    label: "First Section Title",
    description: "Title for the first section",
    type: "text",
    page: "homepage",
    defaultValue: "Crafted With Precision",
    placeholder: "e.g. Crafted With Precision",
  },
  {
    key: "dark-trend.first-section-image",
    label: "First Section Image",
    description: "Image for the first section",
    type: "image",
    page: "homepage",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dark-trend.first-section-button-text",
    label: "First Section Button Text",
    description: "Button text for the first section",
    type: "text",
    page: "homepage",
    defaultValue: "Learn More",
    placeholder: "Learn More",
  },
  {
    key: "dark-trend.first-section-button-link",
    label: "First Section Button Link",
    description: "Button link for the first section",
    type: "url",
    page: "homepage",
    defaultValue: "/about",
    placeholder: "/about",
  },
  {
    key: "dark-trend.first-section-description",
    label: "First Section Description",
    description: "Description for the first section",
    type: "textarea",
    page: "homepage",
    defaultValue:
      "From concept to creation, every detail is handled with care. We bring bold ideas to life with craftsmanship that speaks for itself.",
    placeholder: "A short description for this section...",
  },
  {
    key: "dark-trend.first-section-subheader",
    label: "First Section Subheader",
    description: "Subheader for the first section",
    type: "text",
    page: "homepage",
    defaultValue: "Our Craft",
    placeholder: "e.g. Our Craft",
  },
  {
    key: "dark-trend.second-section-title",
    label: "Second Section Title",
    description: "Title for the second section",
    type: "text",
    page: "homepage",
    defaultValue: "New Arrivals",
    placeholder: "e.g. New Arrivals",
  },
  {
    key: "dark-trend.second-section-description",
    label: "Second Section Description",
    description: "Description for the second section",
    type: "textarea",
    page: "homepage",
    defaultValue:
      "Explore our latest drops — limited runs, bold designs, built to stand out.",
    placeholder: "A short description for this section...",
  },
  {
    key: "dark-trend.second-section-image",
    label: "Second Section Image",
    description: "Image for the second section",
    type: "image",
    page: "homepage",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dark-trend.cta-header",
    label: "CTA Header",
    description: "Header for the CTA section",
    type: "text",
    page: "homepage",
    defaultValue: "Ready to Make Something?",
    placeholder: "e.g. Ready to Make Something?",
  },
  {
    key: "dark-trend.cta-description",
    label: "CTA Description",
    description: "Description for the CTA section",
    type: "textarea",
    page: "homepage",
    defaultValue:
      "Whether it's a custom order or something off the rack — we've got you covered.",
    placeholder: "A short invitation to shop or get in touch...",
  },
  {
    key: "dark-trend.cta-button-text",
    label: "CTA Button Text",
    description: "Button text for the CTA section",
    type: "text",
    page: "homepage",
    defaultValue: "Get Started",
    placeholder: "Get Started",
  },
  {
    key: "dark-trend.cta-button-link",
    label: "CTA Button Link",
    description: "Button link for the CTA section",
    type: "url",
    page: "homepage",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "dark-trend.cta-image",
    label: "CTA Image",
    description: "Image for the CTA section",
    type: "image",
    page: "homepage",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dark-trend.homepage.gallery",
    label: "Homepage Gallery",
    description: "Gallery to display on homepage",
    type: "gallery",
    page: "homepage",
  },
  {
    key: "dark-trend.homepage.hero-image",
    label: "Homepage Hero Image",
    description: "Image for the hero section",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dark-trend.homepage.hero-title",
    label: "Homepage Hero Title",
    description: "Title for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Bold Designs. Built Different.",
    placeholder: "e.g. Bold Designs. Built Different.",
  },
  {
    key: "dark-trend.homepage.hero-button-text",
    label: "Homepage Hero Button Text",
    description: "Button text for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "Shop Now",
  },
  {
    key: "dark-trend.homepage.hero-button-link",
    label: "Homepage Hero Button Link",
    description: "Button link for the hero section",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

const contactPageData: TemplateField[] = [
  {
    key: "dark-trend.contact.header",
    label: "Contact Header",
    description: "Header for the contact page",
    type: "text",
    page: "contact",
    defaultValue: "Contact Us",
    placeholder: "Contact Us",
  },
  {
    key: "dark-trend.contact.subheader",
    label: "Contact Subheader",
    description: "Subheader for the contact page",
    type: "text",
    page: "contact",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "dark-trend.contact.description",
    label: "Contact Description",
    description: "Description for the contact page",
    type: "textarea",
    page: "contact",
    defaultValue:
      "Have a question or a custom request? Send us a message and we'll get back to you shortly.",
    placeholder: "A short intro for your contact page...",
  },
  {
    key: "dark-trend.contact.image",
    label: "Contact Image",
    description: "Image for the contact page",
    type: "image",
    page: "contact",
    defaultValue: "/placeholder.svg",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero Section",
    description: "Main banner area at the top of homepage",
    icon: "🎯",
    columns: 2,
  },

  ...aboutDarkTrendFieldGroups,
  ...darkTrendBlogFieldGroups,
];

export const darkTrendData = {
  "dark-trend": [
    ...aboutDarkTrendPageData,
    ...homepageData,
    ...contactPageData,
    ...darkTrendBlogData,
  ],
};

export const darkTrendFieldGroups = {
  "dark-trend": fieldGroups,
};

const _darkTrendFieldMap = new Map(
  darkTrendData["dark-trend"].map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _darkTrendFieldMap);
}
