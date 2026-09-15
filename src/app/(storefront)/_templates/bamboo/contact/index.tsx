import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactPageData: TemplateField[] = [
  {
    key: "bamboo.contact.header",
    label: "Contact Page Header",
    description: "Main heading for the contact page",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.contact.subheader",
    label: "Contact Page Subheader",
    description: "Subheader or intro below the heading",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    defaultValue:
      "Have a question, want to partner with us, or just want to say hello? We would love to hear from you.",
    placeholder:
      "Have a question, want to partner with us, or just want to say hello? We would love to hear from you.",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.contact.hero-image",
    label: "Contact Hero Image",
    description: "Image beside the contact page heading",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.contact.hours",
    label: "Business Hours",
    description: "Business hours text",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Mon - Fri, 9am - 5pm EST",
    placeholder: "Mon - Fri, 9am - 5pm EST",
    gridColumn: "col-span-full",
  },
];

const contactMapData: TemplateField[] = [
  {
    key: "bamboo.contact.map-heading",
    label: "Map Heading",
    description: "Heading above the location map on the contact page",
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
    key: "bamboo.contact.faq-heading",
    label: "FAQ Heading",
    description: "Heading above the frequently-asked-questions accordion.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue: "Frequently Asked Questions",
  },
  {
    key: "bamboo.contact.faq-lede",
    label: "FAQ Lede",
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
      "Shown as an accordion below the contact form, up to 10. Leave empty to use the built-in defaults.",
    type: "list",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 10,
    itemSchema: [
      {
        key: "question",
        label: "Question",
        type: "text",
        placeholder: "e.g. Do you ship outside Michigan?",
      },
      {
        key: "answer",
        label: "Answer",
        type: "textarea",
        placeholder: "Your answer",
      },
    ],
  },
];

export const bambooContactData = [
  ...contactPageData,
  ...contactMapData,
  ...contactFaqData,
];

export const bambooContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact page header and contact details",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.map",
    title: "Location Map",
    description: "Interactive map shown below the contact form",
    icon: "📍",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ",
    description:
      "Frequently asked questions shown at the bottom of the contact page",
    icon: "❓",
    columns: 1,
  },
];
