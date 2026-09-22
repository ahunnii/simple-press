import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactHeaderData: TemplateField[] = [
  {
    key: "default.contact.eyebrow",
    label: "Page Eyebrow",
    description: "Small label above the heading",
    type: "text",
    page: "contact",
    group: "contact.header",
    defaultValue: "Get in touch",
    placeholder: "Get in touch",
  },
  {
    key: "default.contact.heading",
    label: "Page Heading",
    description: "Main heading for the Contact page",
    type: "text",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    defaultValue: "Say hello.",
    placeholder: "Say hello.",
  },
  {
    key: "default.contact.description",
    label: "Tagline",
    description: "Short line below the heading",
    type: "text",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    defaultValue: "I read every message myself and reply within a day.",
    placeholder: "I read every message myself and reply within a day.",
  },
];

const contactFaqData: TemplateField[] = [
  {
    key: "default.contact.faq",
    label: "Questions",
    description:
      "Pick questions from Content → FAQ. Leave empty to show the first 6 published questions.",
    type: "faq",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 6,
  },
];

export const defaultContactData: TemplateField[] = [
  ...contactHeaderData,
  ...contactFaqData,
];

export const defaultContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.header",
    title: "Contact Header",
    description: "Heading and tagline for the Contact page",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "Contact — FAQ",
    description:
      "Questions pulled from Content → FAQ, shown below the contact form",
    icon: "❓",
    columns: 2,
  },
];
