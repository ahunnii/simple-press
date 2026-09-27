import { iconRowsFromDefaults } from "~/lib/lucide-template-icons";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/** Service cards beside the services page overview text. */
const POLLEN_SERVICES_DEFAULT_ROWS = [
  {
    icon: "Flower2",
    title: "Custom Orders",
    description: "One-of-a-kind pieces made to your specifications.",
  },
  {
    icon: "HandHelping",
    title: "Personal Consultations",
    description: "One-on-one guidance to help you find the right fit.",
  },
  {
    icon: "Map",
    title: "Local Delivery",
    description: "Fast, friendly delivery right to your door.",
  },
  {
    icon: "BookOpen",
    title: "Workshops & Classes",
    description: "Hands-on sessions to learn the craft yourself.",
  },
] satisfies Record<string, string>[];

export const pollenServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "products.main",
    title: "Services overview",
    description: "Page hero, intro copy, and service cards.",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "products.faq",
    title: "FAQ",
    description:
      "Questions and answers below the services overview, plus an image and a contact button.",
    icon: "💬",
    columns: 2,
  },
  {
    id: "products.resources",
    title: "Helpful Resources",
    description:
      "Up to 12 free resource links for clients. The section only appears once you add at least one.",
    icon: "🔗",
    columns: 2,
  },
];

const servicesPageData: TemplateField[] = [
  {
    key: "pollen.services.page-title",
    label: "Page title",
    description: "Main heading shown in the services page hero.",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "Services",
    placeholder: "Services",
  },
  {
    key: "pollen.services.page-subtitle",
    label: "Page subtitle",
    description: "Small label shown above the page title.",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "What We Do",
    placeholder: "What We Do",
  },
  {
    key: "pollen.services.title",
    label: "Heading",
    description: "Heading for the services overview, beside the service cards.",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "About Our Services",
    placeholder: "Our Services",
  },
  {
    key: "pollen.services.subtitle",
    label: "Small label",
    description: "Short line above the heading in the services overview.",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "What We Do",
    placeholder: "What We Do",
  },
  {
    key: "pollen.services.text",
    label: "Body text",
    description: "Paragraph below the heading in the services overview.",
    type: "textarea",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Whatever you need, we're here to help — from first consultation to final delivery. Reach out and let's talk through the details.",
    placeholder:
      "Whatever you need, we're here to help — from first consultation to final delivery.",
  },
  {
    key: "pollen.services.contact-button-text",
    label: "Button text",
    description: "Label on the button in the services overview.",
    type: "text",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "pollen.services.contact-button-link",
    label: "Button link",
    description: "Where the button in the services overview goes.",
    type: "url",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "pollen.services.services-list",
    label: "Service cards",
    description:
      "Cards shown beside the overview text (icon, name, and description per card). Falls back to ready-made examples until you add your own. Add up to 8.",
    type: "list",
    page: "services",
    group: "products.main",
    gridColumn: "col-span-full",
    itemLabel: "service",
    summaryKey: "title",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown on the card.",
      },
      {
        key: "title",
        label: "Name",
        type: "text",
        description: "Service name.",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "One or two sentences about the service.",
      },
    ],
    minItems: 0,
    maxItems: 8,
    defaultRows: POLLEN_SERVICES_DEFAULT_ROWS,
  },
];

const servicesQuestionsData: TemplateField[] = [
  {
    key: "pollen.services.faq-label",
    label: "Small label",
    description: "Short line above the FAQ heading.",
    type: "text",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-1",
    defaultValue: "You Have Questions?",
    placeholder: "You Have Questions?",
  },
  {
    key: "pollen.services.faq-heading",
    label: "Heading",
    description: "Heading above the FAQ accordion.",
    type: "text",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-1",
    defaultValue: "Frequently Asked Questions",
    placeholder: "Frequently Asked Questions",
  },
  {
    key: "pollen.services.faq-description",
    label: "Body text",
    description: "Line below the FAQ heading.",
    type: "textarea",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-full",
    defaultValue:
      "Have questions? We have answers. Browse our most frequently asked questions below.",
    placeholder: "A line inviting people to browse the questions below...",
  },
  {
    key: "pollen.services.faq-image",
    label: "Image",
    description: "Photo beside the FAQ accordion.",
    type: "image",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pollen.services.faq-contact-button-text",
    label: "Button text",
    description: "Label on the button below the FAQ accordion.",
    type: "text",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
    placeholder: "Contact Us",
  },
  {
    key: "pollen.services.faq-contact-button-link",
    label: "Button link",
    description: "Where the button below the FAQ accordion goes.",
    type: "url",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "pollen.services.faq-list",
    label: "Questions",
    description:
      "Pick questions from Content → FAQ for the services page accordion. Leave empty to show the first 10 published questions; the section hides when there are none.",
    type: "faq",
    page: "services",
    group: "products.faq",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 10,
  },
];

const servicesResourcesData: TemplateField[] = [
  {
    key: "pollen.services.resources-label",
    label: "Small label",
    description: "Short line above the resources heading.",
    type: "text",
    page: "services",
    group: "products.resources",
    gridColumn: "col-span-full",
    defaultValue: "Free for you",
    placeholder: "Free for you",
  },
  {
    key: "pollen.services.resources-title",
    label: "Heading",
    description: "Heading for the resources section, e.g. Helpful Resources.",
    type: "text",
    page: "services",
    group: "products.resources",
    gridColumn: "col-span-full",
    defaultValue: "Helpful Resources",
    placeholder: "Helpful Resources",
  },
  {
    key: "pollen.services.resources-list",
    label: "Resources",
    description:
      "Links shown in this section (name and link each). The section only appears once you add at least one. Add up to 12.",
    type: "list",
    page: "services",
    group: "products.resources",
    gridColumn: "col-span-full",
    itemLabel: "resource",
    summaryKey: "name",
    itemSchema: [
      {
        key: "name",
        label: "Name",
        type: "text",
        description: "Link text shown to visitors.",
        placeholder: "e.g. Care Guide",
      },
      {
        key: "url",
        label: "Link",
        type: "url",
        description: "Where the link goes.",
        placeholder: "https://...",
      },
    ],
    minItems: 0,
    maxItems: 12,
  },
];

export const pollenServicesData = [
  ...servicesPageData,
  ...servicesQuestionsData,
  ...servicesResourcesData,
];

export const DEFAULT_POLLEN_SERVICES = iconRowsFromDefaults(
  POLLEN_SERVICES_DEFAULT_ROWS,
);
