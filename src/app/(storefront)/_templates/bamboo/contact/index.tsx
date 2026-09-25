import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactPageData: TemplateField[] = [
  {
    key: "bamboo.contact.header",
    label: "Heading",
    description: "Main heading at the top of the contact page.",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.contact.subheader",
    label: "Intro text",
    description: "Line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    defaultValue:
      "Have a question, want to partner with us, or just want to say hello? We would love to hear from you.",
    placeholder: "Have a question or want to say hello?",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.contact.hero-image",
    label: "Photo",
    description: "Photo shown beside the heading.",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.contact.hero-bg-image",
    label: "Background image override",
    description:
      "Overrides the site-wide Page Hero Background for this page only. Blank = use the site-wide image, or the flat band if none is set.",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

const contactFormData: TemplateField[] = [
  {
    key: "bamboo.contact.form-success-heading",
    label: "Success heading",
    description:
      "Heading shown after someone sends the contact form, in place of the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Message sent",
    placeholder: "Message sent",
  },
  {
    key: "bamboo.contact.form-success-body",
    label: "Success message",
    description:
      "Line shown under the success heading after someone sends the contact form.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    defaultValue: "Thanks for reaching out. We'll get back to you soon.",
    placeholder: "Thanks for reaching out. We'll be in touch shortly.",
    gridColumn: "col-span-full",
  },
];

const contactMapData: TemplateField[] = [
  {
    key: "bamboo.contact.map-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.map",
    gridColumn: "col-span-1",
    defaultValue: "Find Us",
    placeholder: "Find Us",
  },
  {
    key: "bamboo.contact.map-heading",
    label: "Heading",
    description: "Heading above the map.",
    type: "text",
    page: "contact",
    group: "contact.map",
    defaultValue: "Visit Us",
    placeholder: "Visit Us",
    gridColumn: "col-span-full",
  },
];

const contactFaqData: TemplateField[] = [
  {
    key: "bamboo.contact.faq-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Answers",
    placeholder: "Answers",
  },
  {
    key: "bamboo.contact.faq-heading",
    label: "Heading",
    description: "Heading above the questions.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue: "Frequently Asked Questions",
  },
  {
    key: "bamboo.contact.faq-lede",
    label: "Intro text",
    description:
      "Optional supporting line under the heading. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "bamboo.contact.faq",
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

export const bambooContactData = [
  ...contactPageData,
  ...contactFormData,
  ...contactMapData,
  ...contactFaqData,
];

export const bambooContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact intro",
    description:
      "Heading, intro, and photo at the top of the contact page. Your email, phone, address, and hours come from Settings.",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description:
      "Message shown after someone sends the contact form. Your email address comes from Settings.",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.map",
    title: "Map",
    description:
      "Interactive map with directions, shown below the contact form. The map appears once you set a map pin in Settings → General.",
    icon: "📍",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ",
    description: "Common questions answered at the bottom of the contact page.",
    icon: "❓",
    columns: 1,
  },
];
