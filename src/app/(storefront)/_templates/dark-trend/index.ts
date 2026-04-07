import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const aboutPageData: TemplateField[] = [
  {
    key: "dark-trend.about.first-image",
    label: "About First Image",
    description: "Image for the first section of the about page",
    type: "url",
    page: "about",
    placeholder: "https://...",
  },
  {
    key: "dark-trend.about.second-image",
    label: "About Second Image",
    description: "Image for the second section of the about page",
    type: "url",
    page: "about",
    placeholder: "https://...",
  },
  {
    key: "dark-trend.about.header",
    label: "About Header",
    description: "Header for the about page",
    type: "text",
    page: "about",
    defaultValue: "About Us",
    placeholder: "About Us",
  },
  {
    key: "dark-trend.about.subheader",
    label: "About Subheader",
    description: "Subheader for the about page",
    type: "text",
    page: "about",
    defaultValue: "Our Story",
    placeholder: "Our Story",
  },
  {
    key: "dark-trend.about.button",
    label: "About Button",
    description: "Button for the about page",
    type: "text",
    page: "about",
    defaultValue: "Learn More",
    placeholder: "Learn More",
  },
  {
    key: "dark-trend.about.button-link",
    label: "About Button Link",
    description: "Button link for the about page",
    type: "url",
    page: "about",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
  {
    key: "dark-trend.about.cta-header",
    label: "About CTA Header",
    description: "CTA header for the about page",
    type: "text",
    page: "about",
    defaultValue: "Ready to Work Together?",
    placeholder: "e.g. Ready to Work Together?",
  },
  {
    key: "dark-trend.about.feature-1-header",
    label: "About Feature 1 Header",
    description: "Feature 1 header for the about page",
    type: "text",
    page: "about",
    defaultValue: "Premium Quality",
    placeholder: "e.g. Premium Quality",
  },
  {
    key: "dark-trend.about.feature-1-description",
    label: "About Feature 1 Description",
    description: "Feature 1 description for the about page",
    type: "textarea",
    page: "about",
    defaultValue:
      "Every piece is crafted with attention to detail and a commitment to excellence.",
    placeholder: "Describe what makes this feature stand out...",
  },
  {
    key: "dark-trend.about.feature-2-header",
    label: "About Feature 2 Header",
    description: "Feature 2 header for the about page",
    type: "text",
    page: "about",
    defaultValue: "Custom Designs",
    placeholder: "e.g. Custom Designs",
  },
  {
    key: "dark-trend.about.feature-2-description",
    label: "About Feature 2 Description",
    description: "Feature 2 description for the about page",
    type: "textarea",
    page: "about",
    defaultValue:
      "We work closely with each client to bring their unique vision to life.",
    placeholder: "Describe what makes this feature stand out...",
  },
  {
    key: "dark-trend.about.feature-3-header",
    label: "About Feature 3 Header",
    description: "Feature 3 header for the about page",
    type: "text",
    page: "about",
    defaultValue: "Fast Turnaround",
    placeholder: "e.g. Fast Turnaround",
  },
  {
    key: "dark-trend.about.feature-3-description",
    label: "About Feature 3 Description",
    description: "Feature 3 description for the about page",
    type: "textarea",
    page: "about",
    defaultValue:
      "We deliver on time, every time — without compromising on quality.",
    placeholder: "Describe what makes this feature stand out...",
  },
  {
    key: "dark-trend.about.cta-description",
    label: "About CTA Description",
    description: "CTA description for the about page",
    type: "textarea",
    page: "about",
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
    defaultValue: "Get Started",
    placeholder: "Get Started",
  },
  {
    key: "dark-trend.about.cta-button-link",
    label: "About CTA Button Link",
    description: "CTA button link for the about page",
    type: "url",
    page: "about",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

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
    type: "url",
    page: "homepage",
    placeholder: "https://...",
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
    type: "url",
    page: "homepage",
    placeholder: "https://...",
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
    type: "url",
    page: "homepage",
    placeholder: "https://...",
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
    type: "url",
    page: "contact",
    placeholder: "https://...",
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
];

export const darkTrendData = {
  "dark-trend": [...aboutPageData, ...homepageData, ...contactPageData],
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
  const raw =
    customFields != null &&
    typeof customFields === "object" &&
    !Array.isArray(customFields)
      ? (customFields as Record<string, string>)
      : {};
  const out: Record<string, string> = {};
  for (const key of keys) {
    const custom = raw[key]?.trim();
    out[key] = custom ?? _darkTrendFieldMap.get(key)?.defaultValue ?? "";
  }
  return out;
}
