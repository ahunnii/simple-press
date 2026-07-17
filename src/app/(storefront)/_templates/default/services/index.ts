import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const servicesHeroData: TemplateField[] = [
  {
    key: "default.services.hero-eyebrow",
    label: "Hero Eyebrow",
    description: "Small label above the page heading",
    type: "text",
    page: "services",
    group: "services.hero",
    defaultValue: "What we offer",
    placeholder: "What we offer",
  },
  {
    key: "default.services.hero-heading",
    label: "Page Heading",
    description: "Main heading for the Services page",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "Services",
    placeholder: "Services",
  },
  {
    key: "default.services.hero-tagline",
    label: "Hero Tagline",
    description: "Short line below the heading",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "default.services.hero-image",
    label: "Hero Image",
    description: "Optional wide image shown below the heading",
    type: "image",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
  },
];

const servicesIntroData: TemplateField[] = [
  {
    key: "default.services.intro-heading",
    label: "Intro Heading",
    description: "Optional heading for the editorial intro band",
    type: "text",
    page: "services",
    group: "services.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "default.services.intro-body",
    label: "Intro Body",
    description: "Optional supporting copy shown below the intro heading",
    type: "textarea",
    page: "services",
    group: "services.intro",
    gridColumn: "col-span-full",
  },
];

const servicesCtaData: TemplateField[] = [
  {
    key: "default.services.cta-eyebrow",
    label: "CTA Eyebrow",
    description: "Small label above the CTA heading",
    type: "text",
    page: "services",
    group: "services.cta",
  },
  {
    key: "default.services.cta-heading",
    label: "CTA Heading",
    description: "Heading for the bottom call-to-action strip",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "Tell us what you need.",
    placeholder: "Tell us what you need.",
  },
  {
    key: "default.services.cta-button-text",
    label: "CTA Button Text",
    description: "Label for the CTA button",
    type: "text",
    page: "services",
    group: "services.cta",
    defaultValue: "Get in touch",
    placeholder: "Get in touch",
  },
  {
    key: "default.services.cta-button-link",
    label: "CTA Button Link",
    description: "Where the CTA button points",
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
    title: "Services — Hero",
    description: "Page heading, tagline, and optional wide hero image",
    icon: "🛠️",
    columns: 2,
  },
  {
    id: "services.intro",
    title: "Services — Intro",
    description: "Optional editorial intro band shown above the service grid",
    icon: "📝",
    columns: 1,
  },
  {
    id: "services.cta",
    title: "Services — CTA",
    description: "Bottom call-to-action strip",
    icon: "👆",
    columns: 2,
  },
];
