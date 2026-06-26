import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Services Page: Hero ──────────────────────────────────────────────────────

const servicesHeroData: TemplateField[] = [
  {
    key: "builders.services.hero-title",
    label: "Services Hero Title",
    description: "Large display headline for the services index page",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "Our Craft",
    placeholder: "Our Craft",
  },
  {
    key: "builders.services.hero-subtitle",
    label: "Services Hero Subtitle",
    description:
      "Introductory paragraph below the hero headline (left-bordered accent line)",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Dedicated to the preservation and structural integrity of Detroit's architectural heritage. We approach every project with raw utility and an uncompromising standard of execution.",
    placeholder: "Short intro about your services…",
  },
];

// ─── Services Page: CTA ───────────────────────────────────────────────────────

const servicesCTAData: TemplateField[] = [
  {
    key: "builders.services.cta-heading",
    label: "CTA Heading",
    description: "Large heading in the bottom call-to-action section",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to Build",
    placeholder: "Ready to Build",
  },
  {
    key: "builders.services.cta-button-label",
    label: "CTA Button Label",
    description: "Text shown on the CTA button",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "Contact the Cooperative",
    placeholder: "Contact the Cooperative",
  },
  {
    key: "builders.services.cta-button-href",
    label: "CTA Button Link",
    description: "URL the CTA button links to",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const buildersServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesCTAData,
];

export const buildersServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Services Hero",
    description: "Headline and intro paragraph for the services index page",
    icon: "🔨",
    columns: 1,
  },
  {
    id: "services.cta",
    title: "Services CTA",
    description: "Call-to-action section at the bottom of the services index",
    icon: "📣",
    columns: 1,
  },
];
