import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const globalData: TemplateField[] = [
  {
    key: "elegant.tagline",
    label: "Tagline",
    description: "Your store's tagline shown in the hero section",
    type: "text",
    page: "global",
    defaultValue: "Natural Skincare",
    placeholder: "e.g. Natural Skincare",
  },
];

const homepageHeroData: TemplateField[] = [
  {
    key: "elegant.homepage.hero-image",
    label: "Hero Image",
    description: "Main hero image (used instead of video when set)",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "elegant.homepage.hero-title-line-1",
    label: "Hero Title — Line 1",
    description: "First line of the hero heading",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Made with care.",
    placeholder: "e.g. Made with care.",
  },
  {
    key: "elegant.homepage.hero-title-line-2",
    label: "Hero Title — Line 2",
    description: "Second line of the hero heading (displayed larger)",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Especially for you.",
    placeholder: "e.g. Especially for you.",
  },
  {
    key: "elegant.homepage.hero-description",
    label: "Hero Description",
    description: "Short tagline below the hero heading",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Check out our products!",
    placeholder: "e.g. Discover our collection",
  },
  {
    key: "elegant.homepage.hero-button-text",
    label: "Hero Button Text",
    description: "Text for the hero CTA button",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "Shop Now",
  },
  {
    key: "elegant.homepage.hero-button-link",
    label: "Hero Button Link",
    description: "URL for the hero CTA button",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

const homepageAboutData: TemplateField[] = [
  {
    key: "elegant.homepage.about.title",
    label: "About Title",
    description: "Heading for the About section on the homepage",
    type: "text",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-full",
    defaultValue: "About Us",
    placeholder: "About Us",
  },
  {
    key: "elegant.homepage.about.text",
    label: "About Text",
    description: "Body text for the About section on the homepage",
    type: "textarea",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-full",
    defaultValue:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis nec sollicitudin urna, vitae dictum nisi. Nullam lobortis ut neque eget cursus.",
    placeholder: "A short description about your brand or products...",
  },
  {
    key: "elegant.homepage.about.image",
    label: "About Image",
    description: "Image for the About section on the homepage",
    type: "image",
    page: "homepage",
    group: "homepage.about",
    gridColumn: "col-span-full",
  },
];

const homepageFeaturesData: TemplateField[] = [
  {
    key: "elegant.homepage.feature-1-title",
    label: "Feature 1 Title",
    description: "Title for the first feature card",
    type: "text",
    page: "homepage",
    group: "homepage.features",
    defaultValue: "Eco-Friendly Packaging",
    placeholder: "e.g. Eco-Friendly Packaging",
  },
  {
    key: "elegant.homepage.feature-1-description",
    label: "Feature 1 Description",
    description: "Description for the first feature card",
    type: "text",
    page: "homepage",
    group: "homepage.features",
    defaultValue: "Recyclable and biodegradable materials",
    placeholder: "Short description...",
  },
  {
    key: "elegant.homepage.feature-2-title",
    label: "Feature 2 Title",
    description: "Title for the second feature card",
    type: "text",
    page: "homepage",
    group: "homepage.features",
    defaultValue: "100% Natural",
    placeholder: "e.g. 100% Natural",
  },
  {
    key: "elegant.homepage.feature-2-description",
    label: "Feature 2 Description",
    description: "Description for the second feature card",
    type: "text",
    page: "homepage",
    group: "homepage.features",
    defaultValue: "No synthetic chemicals or parabens",
    placeholder: "Short description...",
  },
  {
    key: "elegant.homepage.feature-3-title",
    label: "Feature 3 Title",
    description: "Title for the third feature card",
    type: "text",
    page: "homepage",
    group: "homepage.features",
    defaultValue: "Plant-Based",
    placeholder: "e.g. Plant-Based",
  },
  {
    key: "elegant.homepage.feature-3-description",
    label: "Feature 3 Description",
    description: "Description for the third feature card",
    type: "text",
    page: "homepage",
    group: "homepage.features",
    defaultValue: "Botanical extracts and essential oils",
    placeholder: "Short description...",
  },
  {
    key: "elegant.homepage.feature-4-title",
    label: "Feature 4 Title",
    description: "Title for the fourth feature card",
    type: "text",
    page: "homepage",
    group: "homepage.features",
    defaultValue: "Ethical Sourcing",
    placeholder: "e.g. Ethical Sourcing",
  },
  {
    key: "elegant.homepage.feature-4-description",
    label: "Feature 4 Description",
    description: "Description for the fourth feature card",
    type: "text",
    page: "homepage",
    group: "homepage.features",
    defaultValue: "Fair trade certified ingredients",
    placeholder: "Short description...",
  },
];

const homepageCtaData: TemplateField[] = [
  {
    key: "elegant.cta.background",
    label: "CTA Background Image",
    description: "Background image for the CTA banner",
    type: "image",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "elegant.cta.title",
    label: "CTA Title",
    description: "Main heading for the CTA banner",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue: "100% Natural",
    placeholder: "e.g. 100% Natural",
  },
  {
    key: "elegant.cta.pointone",
    label: "CTA Point One",
    description: "First bullet point for the CTA banner",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    defaultValue: "No Harsh Chemicals",
    placeholder: "e.g. No Harsh Chemicals",
  },
  {
    key: "elegant.cta.pointtwo",
    label: "CTA Point Two",
    description: "Second bullet point for the CTA banner",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    defaultValue: "Plant-Based Goodness",
    placeholder: "e.g. Plant-Based Goodness",
  },
  {
    key: "elegant.cta.pointthree",
    label: "CTA Point Three",
    description: "Third bullet point for the CTA banner",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    defaultValue: "Ethically Sourced",
    placeholder: "e.g. Ethically Sourced",
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
    id: "homepage.about",
    title: "About Section",
    description: "About blurb and image shown below the product grid",
    icon: "📖",
    columns: 1,
  },
  {
    id: "homepage.features",
    title: "Feature Cards",
    description: "Four feature cards displayed alongside the about section",
    icon: "✨",
    columns: 2,
  },
  {
    id: "homepage.cta",
    title: "CTA Banner",
    description: "Call-to-action banner with bullet points",
    icon: "📣",
    columns: 1,
  },
];

export const elegantData = {
  elegant: [
    ...globalData,
    ...homepageHeroData,
    ...homepageAboutData,
    ...homepageFeaturesData,
    ...homepageCtaData,
  ],
};

export const elegantFieldGroups = {
  elegant: fieldGroups,
};

const _elegantFieldMap = new Map(
  elegantData.elegant.map((field) => [field.key, field]),
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
    out[key] = custom ?? _elegantFieldMap.get(key)?.defaultValue ?? "";
  }
  return out;
}
