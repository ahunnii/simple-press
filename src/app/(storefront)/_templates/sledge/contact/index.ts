import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactPageData: TemplateField[] = [
  {
    key: "sledge.contact-image",
    label: "Contact Hero Image",
    description: "Full-width banner image at the top of the contact page",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "sledge.contact.location-heading",
    label: "Location Heading",
    description: "Heading above the shop address",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Shop Location",
  },
  {
    key: "sledge.contact.location-note",
    label: "Location Note",
    description: "Secondary text below the shop address",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue:
      "Purchases may be picked up at location or shipped out. Please call for hours.",
  },
  {
    key: "sledge.contact.email-heading",
    label: "Email Heading",
    description: "Heading above the support email",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Email Address",
  },
  {
    key: "sledge.contact.phone-heading",
    label: "Phone Heading",
    description: "Heading above the phone number",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Phone Number",
  },
  {
    key: "sledge.contact.form-title",
    label: "Form Title",
    description: "Heading shown on the contact form card",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Send Us A Message",
  },
  {
    key: "sledge.contact.trending-heading",
    label: "Trending Section Heading",
    description: "Heading for the product rail below the contact form",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Trending Now",
  },
];

export const sledgeContactData = [...contactPageData];

export const sledgeContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact Page",
    description:
      "Hero image, contact info headings, form title, and trending section",
    icon: "📧",
    columns: 2,
  },
];
