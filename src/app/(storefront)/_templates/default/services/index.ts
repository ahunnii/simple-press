import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const servicesHeroData: TemplateField[] = [
  {
    key: "default.services.hero-eyebrow",
    label: "Small label",
    description:
      "Short text above the page heading on the Services page. Leave blank to hide.",
    type: "text",
    page: "services",
    group: "services.hero",
    defaultValue: "What we offer",
    placeholder: "What we offer",
  },
  {
    key: "default.services.hero-heading",
    label: "Heading",
    description: "Main heading at the top of the Services page.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "Services",
    placeholder: "Services",
  },
  {
    key: "default.services.hero-tagline",
    label: "Intro text",
    description: "Short line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "default.services.hero-image",
    label: "Photo",
    description:
      "Optional wide photo shown below the heading. Leave blank to hide.",
    type: "image",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
  },
];

const servicesIntroData: TemplateField[] = [
  {
    key: "default.services.intro-heading",
    label: "Heading",
    description:
      "Optional heading for the intro band above the service grid. Leave blank to hide.",
    type: "text",
    page: "services",
    group: "services.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "default.services.intro-body",
    label: "Body text",
    description:
      "Optional supporting copy below the intro heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.intro",
    gridColumn: "col-span-full",
  },
];

const servicesCtaData: TemplateField[] = [
  {
    key: "default.services.cta-eyebrow",
    label: "Small label",
    description:
      "Short text above the heading in the bottom call-to-action strip. Leave blank to hide.",
    type: "text",
    page: "services",
    group: "services.cta",
  },
  {
    key: "default.services.cta-heading",
    label: "Heading",
    description: "Heading for the bottom call-to-action strip.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "Tell us what you need.",
    placeholder: "Tell us what you need.",
  },
  {
    key: "default.services.cta-button-text",
    label: "Button text",
    description: "Label on the bottom call-to-action button.",
    type: "text",
    page: "services",
    group: "services.cta",
    defaultValue: "Get in touch",
    placeholder: "Get in touch",
  },
  {
    key: "default.services.cta-button-link",
    label: "Button link",
    description: "Where the bottom button goes, e.g. /contact.",
    type: "url",
    page: "services",
    group: "services.cta",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

export const defaultServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesIntroData,
  ...servicesCtaData,
];

export const defaultServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Hero",
    description: "Page heading, intro text, and optional wide photo.",
    icon: "🛠️",
    columns: 2,
  },
  {
    id: "services.intro",
    title: "Intro",
    description: "Optional editorial intro band shown above the service grid.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "services.cta",
    title: "Closing banner",
    description: "Bottom banner inviting visitors to get in touch.",
    icon: "👆",
    columns: 2,
  },
];
