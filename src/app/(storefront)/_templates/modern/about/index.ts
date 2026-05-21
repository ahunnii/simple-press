import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const aboutMainData: TemplateField[] = [
  {
    key: "modern.about.main-tagline",
    label: "Main Tagline",
    description: "Tagline for the main section",
    type: "text",
    page: "about",
    group: "about.main",
    defaultValue: "Our Story",
    placeholder: "e.g. Our Story",
  },
  {
    key: "modern.about.main-title",
    label: "Main Title",
    description: "Title for the main section",
    type: "text",
    page: "about",
    group: "about.main",
    defaultValue: "About Us",
    placeholder: "e.g. About Us",
  },
];

const aboutMissionData: TemplateField[] = [
  {
    key: "modern.about.mission-tagline",
    label: "Mission Tagline",
    description: "Tagline for the mission section, appearing above the header",
    type: "text",
    page: "about",
    group: "about.mission",
    defaultValue: "Our Mission",
    placeholder: "e.g. Our Mission",
  },
  {
    key: "modern.about.mission-header",
    label: "Mission Header",
    description: "Header for the mission section",
    type: "text",
    page: "about",
    group: "about.mission",
    defaultValue: "Making quality accessible",
    placeholder: "e.g. Making quality accessible",
  },
  {
    key: "modern.about.mission-description",
    label: "Mission Description",
    description: "Description for the mission section",
    type: "textarea",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    defaultValue:
      "Haven was founded on a simple idea: that the objects we surround ourselves with should be beautiful, functional, and made with care. We partner directly with artisans and small makers from around the world, bringing you pieces that are as meaningful as they are well-made.",
    placeholder: "Share your brand's founding story and mission...",
  },
  {
    key: "modern.about.mission-image",
    label: "Mission Image",
    description: "Image for the mission section",
    type: "image",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const aboutValuesData: TemplateField[] = [
  {
    key: "modern.about.values-tagline",
    label: "Values Tagline",
    description: "Tagline for the values section, appearing above the header",
    type: "text",
    page: "about",
    group: "about.values",
    defaultValue: "What Drives Us",
    placeholder: "e.g. What Drives Us",
  },
  {
    key: "modern.about.values-header",
    label: "Values Header",
    description: "Header for the values section",
    type: "text",
    page: "about",
    group: "about.values",
    defaultValue: "Our Values",
    placeholder: "e.g. Our Values",
  },
  {
    key: "modern.about.values-list",
    label: "Values List",
    description: "List of values for the values section",
    type: "list",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Title of the value",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Description of the value",
      },
    ],
    minItems: 0,
    maxItems: 3,
  },
];

const aboutStoryData: TemplateField[] = [
  {
    key: "modern.about.story-tagline",
    label: "Story Tagline",
    description: "Tagline for the story section",
    type: "text",
    page: "about",
    group: "about.story",
    defaultValue: "Our Story",
    placeholder: "e.g. Our Story",
  },
  {
    key: "modern.about.story-header",
    label: "Story Header",
    description: "Header for the story section",
    type: "text",
    page: "about",
    group: "about.story",
    defaultValue: "From a small studio to your home",
    placeholder: "e.g. From a small studio to your home",
  },
  {
    key: "modern.about.story-description",
    label: "Story Description",
    description: "Description for the story section",
    type: "textarea",
    page: "about",
    group: "about.story",
    defaultValue: "Tell your story here...",
    placeholder: "e.g. Tell your story here...",
  },
  {
    key: "modern.about.story-image",
    label: "Story Image",
    description: "Image for the story section",
    type: "image",
    page: "about",
    group: "about.story",
    defaultValue: "/placeholder.svg",
  },
];

const aboutCTAData: TemplateField[] = [
  {
    key: "modern.about.cta-header",
    label: "CTA Header",
    description: "Header for the CTA section",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to find something you love?",
    placeholder: "e.g. Ready to find something you love?",
  },
  {
    key: "modern.about.cta-description",
    label: "CTA Description",
    description: "Description for the CTA section",
    type: "textarea",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Browse our full collection and discover pieces made with care, sourced with intention.",
    placeholder:
      "e.g. Browse our full collection and discover pieces made with care, sourced with intention.",
  },
  {
    key: "modern.about.cta-button-text",
    label: "CTA Button Text",
    description: "Button text for the CTA section",
    type: "text",
    page: "about",
    group: "about.cta",
    defaultValue: "Shop Now",
    placeholder: "e.g. Shop Now",
  },
  {
    key: "modern.about.cta-button-link",
    label: "CTA Button Link",
    description: "Button link for the CTA section",
    type: "url",
    page: "about",
    group: "about.cta",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

export const modernAboutData = [
  ...aboutMainData,
  ...aboutMissionData,
  ...aboutValuesData,
  ...aboutStoryData,
  ...aboutCTAData,
];

export const modernAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.main",
    title: "Main",
    description: "Main section for the about page",
    icon: "🏠",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Our Mission",
    description:
      "First section on the about page outlining your mission and values",
    icon: "�",
    columns: 2,
  },
  {
    id: "about.values",
    title: "What We Stand For",
    description:
      "Values section for your business, displayed in the about page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "about.story",
    title: "Our Story",
    description: "Story section for your business, displayed in the about page",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "Call to Action",
    description: "Call to action section at the bottom of the about page",
    icon: "💬",
    columns: 2,
  },
];

export const DEFAULT_MODERN_ABOUT_VALUES = [
  {
    title: "Quality First",
    description:
      "Every product is selected for its material quality, craftsmanship, and durability. We believe in buying less but buying better.",
  },
  {
    title: "Sustainably Sourced",
    description:
      "We prioritize natural, renewable, and recycled materials. Our packaging is plastic-free and our shipping is carbon-neutral.",
  },
  {
    title: "Artisan Partnerships",
    description:
      "We work directly with makers, ensuring fair wages and preserving traditional techniques that might otherwise be lost.",
  },
];
