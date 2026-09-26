import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Contact Page ─────────────────────────────────────────────────────────────

const contactPageData: TemplateField[] = [
  {
    key: "noise.contact.overline",
    label: "Small label",
    description:
      "Small label above the heading at the top of the contact page. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "Contact Us",
  },
  {
    key: "noise.contact.header",
    label: "Heading",
    description: "Heading at the top of the contact page.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
  },
  {
    key: "noise.contact.subheader",
    label: "Intro text",
    description: "Short intro paragraph below the heading.",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue:
      "We'd love to hear from you. Reach out about custom orders, collaborations, or just to say hello.",
  },
  {
    key: "noise.contact-image",
    label: "Image",
    description: "Image shown alongside the contact form. Leave blank to hide.",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
  },
];

const contactFaqData: TemplateField[] = [
  {
    key: "noise.contact-faq-title",
    label: "Heading",
    description: "Heading above the FAQ accordion.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Questions & Answers",
  },
  {
    key: "noise.contact-faq-subtitle",
    label: "Intro text",
    description: "Short intro text below the FAQ heading.",
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

const contactFormData: TemplateField[] = [
  {
    key: "noise.contact.form-success-heading",
    label: "Success heading",
    description:
      "Heading shown after someone sends the contact form, in place of the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Message sent!",
  },
  {
    key: "noise.contact.form-success-body",
    label: "Success message",
    description:
      "Line shown under the success heading after someone sends the contact form. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "We'll reply, usually same day.",
    placeholder: "e.g. We'll get back to you soon.",
  },
];

export const noiseContactData = [
  ...contactPageData,
  ...contactFormData,
  ...contactFaqData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact details",
    description:
      "Heading, intro text, and image at the top of the contact page.",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description:
      "Message shown after someone sends the contact form. Messages go to your email address from Settings.",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ",
    description: "Frequently asked questions accordion on the contact page.",
    icon: "❓",
    columns: 1,
  },
];
