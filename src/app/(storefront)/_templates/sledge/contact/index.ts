import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactPageData: TemplateField[] = [
  {
    key: "sledge.contact-image",
    label: "Photo",
    description: "Full-width banner photo at the top of the contact page.",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "sledge.contact.location-heading",
    label: "Location heading",
    description: "Heading above your address, set in Settings → General.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Shop Location",
  },
  {
    key: "sledge.contact.location-note",
    label: "Location note",
    description: "Secondary line below your address. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue:
      "Purchases may be picked up at location or shipped out. Please call for hours.",
  },
  {
    key: "sledge.contact.email-heading",
    label: "Email heading",
    description: "Heading above your support email, set in Settings → General.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Email Address",
  },
  {
    key: "sledge.contact.phone-heading",
    label: "Phone heading",
    description: "Heading above your phone number, set in Settings → General.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Phone Number",
  },
  {
    key: "sledge.contact.hours-heading",
    label: "Hours heading",
    description: "Heading above your business hours, set in Settings → Hours.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Hours",
  },
  {
    key: "sledge.contact.form-title",
    label: "Form heading",
    description: "Heading shown on the contact form card.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Send Us A Message",
  },
];

const contactTrendingData: TemplateField[] = [
  {
    key: "sledge.contact.trending-heading",
    label: "Heading",
    description: "Heading for the product rail below the contact form.",
    type: "text",
    page: "contact",
    group: "contact.trending",
    gridColumn: "col-span-1",
    defaultValue: "Trending Now",
  },
];

const contactFaqData: TemplateField[] = [
  {
    key: "sledge.contact.faq-heading",
    label: "Heading",
    description: "Heading above the questions.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Frequently asked questions",
  },
  {
    key: "sledge.contact.faq-intro",
    label: "Intro text",
    description: "Optional line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "sledge.contact.faq",
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

export const sledgeContactData = [
  ...contactPageData,
  ...contactTrendingData,
  ...contactFaqData,
];

export const sledgeContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact details",
    description: "Photo, contact info headings, and form heading.",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.trending",
    title: "Trending products",
    description: "Product rail shown below the contact form.",
    icon: "🛍️",
    columns: 1,
  },
  {
    id: "contact.faq",
    title: "FAQ",
    description: "Common questions answered at the bottom of the contact page.",
    icon: "❓",
    columns: 1,
  },
];
