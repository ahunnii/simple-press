import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const aboutMainData: TemplateField[] = [
  {
    key: "modern.about.main-tagline",
    label: "Small label",
    description:
      "Short label above the heading at the top of the About page. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.main",
    defaultValue: "Our Story",
    placeholder: "e.g. Our Story",
  },
  {
    key: "modern.about.main-title",
    label: "Heading",
    description: "Main heading at the top of the About page.",
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
    label: "Small label",
    description: "Short label above the mission heading.",
    type: "text",
    page: "about",
    group: "about.mission",
    defaultValue: "Our Mission",
    placeholder: "e.g. Our Mission",
  },
  {
    key: "modern.about.mission-header",
    label: "Heading",
    description: "Heading for the mission section.",
    type: "text",
    page: "about",
    group: "about.mission",
    defaultValue: "Making quality accessible",
    placeholder: "e.g. Making quality accessible",
  },
  {
    key: "modern.about.mission-description",
    label: "Body text",
    description: "Paragraph in the mission section, below the heading.",
    type: "textarea",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    defaultValue:
      "We were founded on a simple idea: that the objects we surround ourselves with should be beautiful, functional, and made with care. Every piece in our collection is chosen to earn a place in your home, not just a spot on a shelf.",
    placeholder: "Share why you started your business and what drives it...",
  },
  {
    key: "modern.about.mission-image",
    label: "Photo",
    description: "Photo shown beside the mission text.",
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
    label: "Small label",
    description: "Short label above the values heading.",
    type: "text",
    page: "about",
    group: "about.values",
    defaultValue: "What Drives Us",
    placeholder: "e.g. What Drives Us",
  },
  {
    key: "modern.about.values-header",
    label: "Heading",
    description: "Heading above the value cards.",
    type: "text",
    page: "about",
    group: "about.values",
    defaultValue: "Our Values",
    placeholder: "e.g. Our Values",
  },
  {
    key: "modern.about.values-list",
    label: "Values",
    description:
      "Up to three cards describing what drives your business. When left empty, three built-in cards are shown instead.",
    type: "list",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short value name, e.g. Quality First.",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "One or two sentences supporting the title.",
      },
    ],
    minItems: 0,
    maxItems: 3,
    itemLabel: "Value",
    defaultsWhenEmpty: true,
  },
];

const aboutStoryData: TemplateField[] = [
  {
    key: "modern.about.story-tagline",
    label: "Small label",
    description: "Short label above the story heading.",
    type: "text",
    page: "about",
    group: "about.story",
    defaultValue: "Our Story",
    placeholder: "e.g. Our Story",
  },
  {
    key: "modern.about.story-header",
    label: "Heading",
    description: "Heading for the story section.",
    type: "text",
    page: "about",
    group: "about.story",
    defaultValue: "From a small studio to your home",
    placeholder: "e.g. From a small studio to your home",
  },
  {
    key: "modern.about.story-description",
    label: "Body text",
    description: "Paragraph telling your story, below the heading.",
    type: "textarea",
    page: "about",
    group: "about.story",
    defaultValue:
      "What started as a small idea has grown into a collection we're proud to share — each piece chosen with the same care as the first.",
    placeholder: "A sentence or two about how your business started and grew.",
  },
  {
    key: "modern.about.story-image",
    label: "Photo",
    description: "Photo shown beside the story text.",
    type: "image",
    page: "about",
    group: "about.story",
    defaultValue: "/placeholder.svg",
  },
];

const aboutCTAData: TemplateField[] = [
  {
    key: "modern.about.cta-header",
    label: "Heading",
    description:
      "Heading on the closing banner at the bottom of the About page.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to find something you love?",
    placeholder: "e.g. Ready to find something you love?",
  },
  {
    key: "modern.about.cta-description",
    label: "Intro text",
    description: "Short text on the closing banner, below the heading.",
    type: "textarea",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Browse our full collection and discover pieces made with care, sourced with intention.",
    placeholder:
      "A sentence or two encouraging people to shop your full collection.",
  },
  {
    key: "modern.about.cta-button-text",
    label: "Button text",
    description: "Label on the closing banner's button.",
    type: "text",
    page: "about",
    group: "about.cta",
    defaultValue: "Shop Now",
    placeholder: "e.g. Shop Now",
  },
  {
    key: "modern.about.cta-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /shop.",
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
    title: "Intro",
    description: "Small label and heading at the top of the About page.",
    icon: "🏠",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Mission",
    description: "First section on the About page, explaining your mission.",
    icon: "🌱",
    columns: 2,
  },
  {
    id: "about.values",
    title: "What we stand for",
    description:
      "Value cards below the mission section, displayed on the About page.",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "about.story",
    title: "Our story",
    description: "Story section with a supporting photo, below the values.",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "Closing banner",
    description:
      "Banner with a heading, text, and button at the bottom of the About page.",
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
    title: "Thoughtful Choices",
    description:
      "We think carefully about the materials we choose and the impact of every decision along the way, from sourcing to how orders reach you.",
  },
  {
    title: "People First",
    description:
      "Behind every order is a real person. We keep things personal, answer questions quickly, and stand behind everything we sell.",
  },
];
