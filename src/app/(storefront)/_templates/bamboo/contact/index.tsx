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

export const bambooContactData = [...contactPageData];

export const bambooContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact page header and contact details",
    icon: "📧",
    columns: 2,
  },
];
