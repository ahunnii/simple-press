import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Contact Page ─────────────────────────────────────────────────────────────

export const buildersContactData: TemplateField[] = [
  {
    key: "builders.contact.header",
    label: "Contact Page Header",
    description: "Main heading on the contact page",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Let's build together.",
  },
  {
    key: "builders.contact.subheader",
    label: "Contact Page Subheader",
    description: "Introductory paragraph below the heading",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue:
      "Whether you have a specific restoration project in mind, want to learn more about our cooperative model, or just want to say hello, we're here. We believe in direct, honest communication—no corporate speak, just real people doing hard work.",
  },
  {
    key: "builders.contact.shop-label",
    label: "Shop Block Label",
    description: "Heading for the address block in the contact info sidebar",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "The Shop",
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const buildersContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact page header, intro copy, and address block label",
    icon: "📞",
    columns: 2,
  },
];
