import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

export const globalData: TemplateField[] = [
  {
    key: "global.logo",
    label: "Logo",
    description: "Logo for the global header",
    type: "url",
    page: "global",
  },
  {
    key: "homepage.portfolio.gallery",
    label: "Portfolio Gallery",
    description: "Gallery to display on homepage",
    type: "gallery",
    page: "homepage",
  },
];

const aboutPageData: TemplateField[] = [
  {
    key: "modern.about.mission-header",
    label: "Mission Header",
    description: "Header for the mission section",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.mission-description",
    label: "Mission Description",
    description: "Description for the mission section",
    type: "textarea",
    page: "about",
  },
  {
    key: "modern.about.values-subheader",
    label: "Values Subheader",
    description: "Subheader for the values section",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.values-header",
    label: "Values Header",
    description: "Header for the values section",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.value-1-title",
    label: "Value 1 Title",
    description: "Title for the first value",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.value-1-description",
    label: "Value 1 Description",
    description: "Description for the first value",
    type: "textarea",
    page: "about",
  },
  {
    key: "modern.about.value-2-title",
    label: "Value 2 Title",
    description: "Title for the second value",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.value-2-description",
    label: "Value 2 Description",
    description: "Description for the second value",
    type: "textarea",
    page: "about",
  },
  {
    key: "modern.about.value-3-title",
    label: "Value 3 Title",
    description: "Title for the third value",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.value-3-description",
    label: "Value 3 Description",
    description: "Description for the third value",
    type: "textarea",
    page: "about",
  },
  {
    key: "modern.about.story-subheader",
    label: "Story Subheader",
    description: "Subheader for the story section",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.story-header",
    label: "Story Header",
    description: "Header for the story section",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.story-paragraph-1",
    label: "Story Paragraph 1",
    description: "First paragraph for the story section",
    type: "textarea",
    page: "about",
  },
  {
    key: "modern.about.story-paragraph-2",
    label: "Story Paragraph 2",
    description: "Second paragraph for the story section",
    type: "textarea",
    page: "about",
  },
  {
    key: "modern.about.first-image",
    label: "Story Image",
    description: "Image for the story section",
    type: "image",
    page: "about",
  },
  {
    key: "modern.about.cta-header",
    label: "CTA Header",
    description: "Header for the CTA section",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.cta-text",
    label: "CTA Text",
    description: "Text for the CTA section",
    type: "textarea",
    page: "about",
  },
  {
    key: "modern.about.cta-button-text",
    label: "CTA Button Text",
    description: "Button text for the CTA section",
    type: "text",
    page: "about",
  },
  {
    key: "modern.about.cta-button-link",
    label: "CTA Button Link",
    description: "Button link for the CTA section",
    type: "url",
    page: "about",
  },
];

const contactPageData: TemplateField[] = [
  {
    key: "modern.contact.header-subheader",
    label: "Header Subheader",
    description: "Subheader for the header section",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.header-title",
    label: "Header Title",
    description: "Title for the header section",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.header-description",
    label: "Header Description",
    description: "Description for the header section",
    type: "textarea",
    page: "contact",
  },
  {
    key: "modern.contact.info-title",
    label: "Info Section Title",
    description: "Title for the contact information section",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.info-description",
    label: "Info Section Description",
    description: "Description for the contact information section",
    type: "textarea",
    page: "contact",
  },
  {
    key: "modern.contact.email-label",
    label: "Email Label",
    description: "Label for the email field",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.email",
    label: "Email Address",
    description: "Email address for contact",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.phone-label",
    label: "Phone Label",
    description: "Label for the phone field",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.phone",
    label: "Phone Number",
    description: "Phone number for contact",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.address-label",
    label: "Address Label",
    description: "Label for the address field",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.address",
    label: "Address",
    description: "Physical address for contact",
    type: "textarea",
    page: "contact",
  },
  {
    key: "modern.contact.hours-label",
    label: "Hours Label",
    description: "Label for the hours field",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.hours",
    label: "Business Hours",
    description: "Business hours for contact",
    type: "textarea",
    page: "contact",
  },
  {
    key: "modern.contact.form-title",
    label: "Form Title",
    description: "Title for the contact form section",
    type: "text",
    page: "contact",
  },
  {
    key: "modern.contact.form-description",
    label: "Form Description",
    description: "Description for the contact form section",
    type: "text",
    page: "contact",
  },
];

const contactPageQuestionsData: TemplateField[] = [
  {
    key: "modern.contact.faq-enabled",
    label: "FAQ Enabled",
    description: "Enable or disable the FAQ section",
    type: "boolean",
    page: "contact",
    defaultValue: "true",
    group: "contact.questions",
  },
  {
    key: "modern.contact.faq-1-question",
    label: "FAQ 1 Question",
    description: "",
    type: "text",
    page: "contact",
    group: "contact.questions",
    placeholder: "What is your return policy?",
  },
  {
    key: "modern.contact.faq-1-answer",
    label: "FAQ 1 Response",
    description: "",
    type: "textarea",
    page: "contact",
    group: "contact.questions",
    placeholder: "We offer a 30-day return policy...",
  },
  {
    key: "modern.contact.faq-2-question",
    label: "FAQ 2 Question",
    description: "",
    type: "text",
    page: "contact",
    group: "contact.questions",
    placeholder: "How long does shipping take?",
  },
  {
    key: "modern.contact.faq-2-answer",
    label: "FAQ 2 Response",
    description: "",
    type: "textarea",
    page: "contact",
    group: "contact.questions",
    placeholder: "Standard shipping takes 5-7 business days...",
  },
  {
    key: "modern.contact.faq-3-question",
    label: "FAQ 3 Question",
    description: "",
    type: "text",
    page: "contact",
    group: "contact.questions",
    placeholder: "Do you ship internationally?",
  },
  {
    key: "modern.contact.faq-3-answer",
    label: "FAQ 3 Response",
    description: "",
    type: "textarea",
    page: "contact",
    group: "contact.questions",
    placeholder: "Yes, we ship to over 40 countries...",
  },
  {
    key: "modern.contact.faq-4-question",
    label: "FAQ 4 Question",
    description: "",
    type: "text",
    page: "contact",
    group: "contact.questions",
    placeholder: "Can I modify or cancel an order?",
  },
  {
    key: "modern.contact.faq-4-answer",
    label: "FAQ 4 Response",
    description: "",
    type: "textarea",
    page: "contact",
    group: "contact.questions",
    placeholder:
      "Orders can be modified or cancelled within 2 hours of placement...",
  },
];

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
    placeholder: "Curated Selection",
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
    placeholder: "Featured Products",
    gridColumn: "col-span-1",
  },
];
const homepageAboutData: TemplateField[] = [
  {
    key: "modern.homepage.about-title",
    label: "About Title",
    description: "Title for the about section",
    type: "text",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
    placeholder: "About Us",
  },
  {
    key: "modern.homepage.about-subtitle",
    label: "About Subtitle",
    description: "Subtitle for the about section",
    type: "text",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-1",
    defaultValue: "Our Story",
    placeholder: "Our Story",
  },
  {
    key: "modern.homepage.about-text",
    label: "About Text",
    description: "Text for the about section",
    type: "textarea",
    page: "homepage",
    group: "homepage.about",
    placeholder: "We work directly with artisans from around the world...",
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
    placeholder: "Learn More",
  },
  {
    key: "modern.homepage.about-cta-button-link",
    label: "About CTA Button Link",
    description: "Button link for the about cta section",
    type: "url",
    page: "homepage",
    group: "homepage.about",
    defaultValue: "/about",
    placeholder: "/about",
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
  {
    id: "global.contact",
    title: "Contact",
    description:
      "Contact information for your business, displayed throughout the site",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "global.services",
    title: "Services",
    description: "Services for your business, set as 4 services max",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "global.cta",
    title: "Call to Action",
    description:
      "CTA section for your business, displayed at the bottom of the page",
    icon: "🎯",
    columns: 2,
  },

  {
    id: "global.header",
    title: "Header",
    description: "Header displayed on the top of most every page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "about.main",
    title: "About Us",
    description:
      "About us section for your business, displayed in the about page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "about.members",
    title: "Team Members",
    description: "Team members for your business, displayed in the about page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "products.main",
    title: "Services Main",
    description: "Main section for the services page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "products.faq",
    title: "Services FAQ",
    description: "FAQ section for the services page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "products.testimonials",
    title: "Services Testimonials",
    description: "Testimonials section for the services page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "contact.main",
    title: "Contact Main",
    description: "Main section for the contact page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "contact.questions",
    title: "Contact Questions",
    description: "Add some frequently asked questions for your business",
    icon: "💬",
    columns: 1,
  },
];

export const modernData = {
  modern: [
    ...globalData,
    ...aboutPageData,
    ...contactPageData,
    ...contactPageQuestionsData,
    ...homepageHeroData,
    ...homepageValuesData,
    ...homepageProductsData,
    ...homepageAboutData,
  ],
};

export const modernFieldGroups = {
  modern: fieldGroups,
};

const _modernFieldMap = new Map(
  modernData.modern.map((field) => [field.key, field]),
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
    out[key] = custom ?? _modernFieldMap.get(key)?.defaultValue ?? "";
  }
  return out;
}
