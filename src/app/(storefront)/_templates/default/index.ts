import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

const homepageData: TemplateField[] = [
  {
    key: "default.homepage.hero-image",
    label: "Hero Image",
    description: "Background image for the hero section",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "default.homepage.hero-description",
    label: "Hero Description",
    description: "Tagline displayed below the business name",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Take a look around!",
    placeholder: "e.g. Take a look around!",
  },
  {
    key: "default.homepage.hero-button-text",
    label: "Primary Button Text",
    description: "Text for the primary hero CTA button",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    defaultValue: "Shop Now",
    placeholder: "Shop Now",
  },
  {
    key: "default.homepage.hero-button-link",
    label: "Primary Button Link",
    description: "URL for the primary hero CTA button",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    defaultValue: "/products",
    placeholder: "/products",
  },
  {
    key: "default.homepage.hero-button-2-text",
    label: "Secondary Button Text",
    description: "Text for the secondary hero CTA button",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    defaultValue: "View Deals",
    placeholder: "View Deals",
  },
  {
    key: "default.homepage.hero-button-2-link",
    label: "Secondary Button Link",
    description: "URL for the secondary hero CTA button",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
  {
    key: "default.homepage.featured-products-heading",
    label: "Featured Products Heading",
    description: "Heading above the featured products grid",
    type: "text",
    page: "homepage",
    group: "homepage.products",
    gridColumn: "col-span-full",
    defaultValue: "Featured Products",
    placeholder: "Featured Products",
  },
  {
    key: "default.homepage.cta-heading",
    label: "CTA Heading",
    description: "Heading for the call-to-action section",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue: "About Us",
    placeholder: "About Us",
  },
  {
    key: "default.homepage.cta-description",
    label: "CTA Description",
    description: "Body text for the call-to-action section",
    type: "textarea",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Learn more about our mission, values, and what makes us unique. We are dedicated to providing the best experience for our customers.",
    placeholder: "A short description about your brand...",
  },
  {
    key: "default.homepage.cta-image",
    label: "CTA Image",
    description: "Optional image for the call-to-action section",
    type: "image",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const aboutPageData: TemplateField[] = [
  {
    key: "default.about.heading",
    label: "Page Heading",
    description: "Main heading for the About page",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "Our Story",
    placeholder: "Our Story",
  },
  {
    key: "default.about.paragraph-1",
    label: "Paragraph 1",
    description: "First paragraph of your story",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc dictum, metus in cursus pharetra, augue purus consequat ligula, nec faucibus ex nulla eu urna.",
    placeholder: "Tell your story...",
  },
  {
    key: "default.about.paragraph-2",
    label: "Paragraph 2",
    description: "Second paragraph of your story",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc dictum, metus in cursus pharetra, augue purus consequat ligula, nec faucibus ex nulla eu urna.",
    placeholder: "Continue your story...",
  },
  {
    key: "default.about.paragraph-3",
    label: "Paragraph 3",
    description: "Third paragraph of your story",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc dictum, metus in cursus pharetra, augue purus consequat ligula, nec faucibus ex nulla eu urna.",
    placeholder: "Finish your story...",
  },
];

const blogPageData: TemplateField[] = [
  {
    key: "default.blog.listing-title",
    label: "Blog listing title",
    description: "Heading shown at the top of the blog index",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue: "Blog",
    placeholder: "Blog",
  },
  {
    key: "default.blog.listing-intro",
    label: "Blog listing intro",
    description: "Short text below the blog heading",
    type: "textarea",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue:
      "News, tips, and updates from our team. Use the search box to find a topic.",
    placeholder: "Intro paragraph for your blog...",
  },
];

const contactPageData: TemplateField[] = [
  {
    key: "default.contact.heading",
    label: "Page Heading",
    description: "Main heading for the Contact page",
    type: "text",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    defaultValue: "Contact Us",
    placeholder: "Contact Us",
  },
  {
    key: "default.contact.description",
    label: "Description",
    description: "Subtext shown below the contact heading",
    type: "textarea",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    defaultValue:
      "Have a question? We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
    placeholder: "How can we help you?",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero Section",
    description: "Main banner at the top of the homepage",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.products",
    title: "Featured Products",
    description: "Featured products grid section",
    icon: "📦",
    columns: 1,
  },
  {
    id: "homepage.cta",
    title: "Call to Action",
    description: "About / CTA section at the bottom of the homepage",
    icon: "📣",
    columns: 1,
  },
  {
    id: "about.story",
    title: "Our Story",
    description: "Content for the About page",
    icon: "📖",
    columns: 1,
  },
  {
    id: "contact.header",
    title: "Contact Header",
    description: "Heading and description for the Contact page",
    icon: "📧",
    columns: 1,
  },
  {
    id: "blog.header",
    title: "Blog listing",
    description: "Heading and intro on the blog index",
    icon: "📝",
    columns: 1,
  },
];

export const defaultTemplateData = {
  default: [
    ...homepageData,
    ...aboutPageData,
    ...contactPageData,
    ...blogPageData,
  ],
};

export const defaultTemplateFieldGroups = {
  default: fieldGroups,
};

const _defaultFieldMap = new Map(
  defaultTemplateData.default.map((field) => [field.key, field]),
);

export function resolveFields(customFields: unknown, keys: string[]): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _defaultFieldMap);
}
