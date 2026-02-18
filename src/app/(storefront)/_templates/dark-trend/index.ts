import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const aboutPageData: TemplateField[] = [
  {
    key: "dark-trend.about.first-image",
    label: "About First Image",
    description: "Image for the first section of the about page",
    type: "url",
    page: "about",
  },
  {
    key: "dark-trend.about.second-image",
    label: "About Second Image",
    description: "Image for the second section of the about page",
    type: "url",
    page: "about",
  },
  {
    key: "dark-trend.about.header",
    label: "About Header",
    description: "Header for the about page",
    type: "text",
    page: "about",
  },
  {
    key: "dark-trend.about.subheader",
    label: "About Subheader",
    description: "Subheader for the about page",
    type: "text",
    page: "about",
  },
  {
    key: "dark-trend.about.button",
    label: "About Button",
    description: "Button for the about page",
    type: "text",
    page: "about",
  },
  {
    key: "dark-trend.about.button-link",
    label: "About Button Link",
    description: "Button link for the about page",
    type: "url",
    page: "about",
  },
  {
    key: "dark-trend.about.cta-header",
    label: "About CTA Header",
    description: "CTA header for the about page",
    type: "text",
    page: "about",
  },
  {
    key: "dark-trend.about.feature-1-header",
    label: "About Feature 1 Header",
    description: "Feature 1 header for the about page",
    type: "text",
    page: "about",
  },
  {
    key: "dark-trend.about.feature-1-description",
    label: "About Feature 1 Description",
    description: "Feature 1 description for the about page",
    type: "textarea",
    page: "about",
  },
  {
    key: "dark-trend.about.feature-2-header",
    label: "About Feature 2 Header",
    description: "Feature 2 header for the about page",
    type: "text",
    page: "about",
  },
  {
    key: "dark-trend.about.feature-2-description",
    label: "About Feature 2 Description",
    description: "Feature 2 description for the about page",
    type: "textarea",
    page: "about",
  },

  {
    key: "dark-trend.about.feature-3-header",
    label: "About Feature 3 Header",
    description: "Feature 3 header for the about page",
    type: "text",
    page: "about",
  },
  {
    key: "dark-trend.about.feature-3-description",
    label: "About Feature 3 Description",
    description: "Feature 3 description for the about page",
    type: "textarea",
    page: "about",
  },

  {
    key: "dark-trend.about.cta-description",
    label: "About CTA Description",
    description: "CTA description for the about page",
    type: "textarea",
    page: "about",
  },
  {
    key: "dark-trend.about.cta-button-text",
    label: "About CTA Button Text",
    description: "CTA button text for the about page",
    type: "text",
    page: "about",
  },
  {
    key: "dark-trend.about.cta-button-link",
    label: "About CTA Button Link",
    description: "CTA button link for the about page",
    type: "url",
    page: "about",
  },
];

const homepageData: TemplateField[] = [
  {
    key: "dark-trend.first-section-title",
    label: "First Section Title",
    description: "Title for the first section",
    type: "text",
    page: "homepage",
  },
  {
    key: "dark-trend.first-section-image",
    label: "First Section Image",
    description: "Image for the first section",
    type: "url",
    page: "homepage",
  },
  {
    key: "dark-trend.first-section-button-text",
    label: "First Section Button Text",
    description: "Button text for the first section",
    type: "text",
    page: "homepage",
  },
  {
    key: "dark-trend.first-section-button-link",
    label: "First Section Button Link",
    description: "Button link for the first section",
    type: "url",
    page: "homepage",
  },
  {
    key: "dark-trend.first-section-description",
    label: "First Section Description",
    description: "Description for the first section",
    type: "textarea",
    page: "homepage",
  },

  {
    key: "dark-trend.first-section-subheader",
    label: "First Section Subheader",
    description: "Subheader for the first section",
    type: "text",
    page: "homepage",
  },
  {
    key: "dark-trend.second-section-title",
    label: "Second Section Title",
    description: "Title for the second section",
    type: "text",
    page: "homepage",
  },
  {
    key: "dark-trend.second-section-description",
    label: "Second Section Description",
    description: "Description for the second section",
    type: "textarea",
    page: "homepage",
  },
  {
    key: "dark-trend.second-section-image",
    label: "Second Section Image",
    description: "Image for the second section",
    type: "url",
    page: "homepage",
  },
  {
    key: "dark-trend.cta-header",
    label: "CTA Header",
    description: "Header for the CTA section",
    type: "text",
    page: "homepage",
  },
  {
    key: "dark-trend.cta-description",
    label: "CTA Description",
    description: "Description for the CTA section",
    type: "textarea",
    page: "homepage",
  },
  {
    key: "dark-trend.cta-button-text",
    label: "CTA Button Text",
    description: "Button text for the CTA section",
    type: "text",
    page: "homepage",
  },
  {
    key: "dark-trend.cta-button-link",
    label: "CTA Button Link",
    description: "Button link for the CTA section",
    type: "url",
    page: "homepage",
  },
  {
    key: "dark-trend.cta-image",
    label: "CTA Image",
    description: "Image for the CTA section",
    type: "url",
    page: "homepage",
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
  },
  {
    key: "dark-trend.homepage.hero-title",
    label: "Homepage Hero Title",
    description: "Title for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },

  {
    key: "dark-trend.homepage.hero-button-text",
    label: "Homepage Hero Button Text",
    description: "Button text for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
  },
  {
    key: "dark-trend.homepage.hero-button-link",
    label: "Homepage Hero Button Link",
    description: "Button link for the hero section",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
  },
];

const contactPageData: TemplateField[] = [
  {
    key: "dark-trend.contact.header",
    label: "Contact Header",
    description: "Header for the contact page",
    type: "text",
    page: "contact",
  },
  {
    key: "dark-trend.contact.subheader",
    label: "Contact Subheader",
    description: "Subheader for the contact page",
    type: "text",
    page: "contact",
  },
  {
    key: "dark-trend.contact.description",
    label: "Contact Description",
    description: "Description for the contact page",
    type: "textarea",
    page: "contact",
  },
  {
    key: "dark-trend.contact.image",
    label: "Contact Image",
    description: "Image for the contact page",
    type: "url",
    page: "contact",
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
