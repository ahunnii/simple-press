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
    description:
      "Shown in the contact info card. Leave blank to hide — Finally Results' own live site doesn't list hours.",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "",
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

export const bambooContactData = [...contactPageData, ...contactMapData];

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
];
