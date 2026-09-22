import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Contact Page ─────────────────────────────────────────────────────────────

const contactPageData: TemplateField[] = [
  {
    key: "noise.contact.header",
    label: "Contact Page Header",
    description: "Heading shown on the contact page",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
  },
  {
    key: "noise.contact.subheader",
    label: "Contact Page Subheader",
    description: "Short intro below the contact heading",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue:
      "We'd love to hear from you. Reach out about custom orders, collaborations, or just to say hello.",
  },
  {
    key: "noise.contact-image",
    label: "Contact Page Image",
    description: "Editorial image displayed alongside the contact form",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
  },
];

const contactFaqData: TemplateField[] = [
  {
    key: "noise.contact-faq-title",
    label: "FAQ Section Title",
    description: "Heading for the FAQ accordion section",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Questions & Answers",
  },
  {
    key: "noise.contact-faq-subtitle",
    label: "FAQ Section Subtitle",
    description: "Short intro text below the FAQ heading",
    type: "textarea",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Can't find what you're looking for? Send us a message.",
  },
  {
    key: "noise.contact-frequently-asked-questions",
    label: "Questions",
    description:
      "Pick questions from Content → FAQ. Leave empty to show the first 10 published questions.",
    type: "faq",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 10,
  },
];

export const noiseContactData = [...contactPageData, ...contactFaqData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact page header, subheader, and image",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ Section",
    description: "Frequently asked questions accordion",
    icon: "❓",
    columns: 1,
  },
];
