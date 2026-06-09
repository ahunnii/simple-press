import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactPageData: TemplateField[] = [
  {
    key: "pollen.contact.page-title",
    label: "Page Title",
    description: "Main heading shown in the contact page hero",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
    placeholder: "Contact Us",
  },
  {
    key: "pollen.contact.page-subtitle",
    label: "Page Subtitle",
    description: "Small label shown above the page title",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Let's Talk",
    placeholder: "Let's Talk",
  },
  {
    key: "pollen.contact.form-title",
    label: "Form Title",
    description: "Title for the contact form",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-full",
    defaultValue: "Send us a message",
    placeholder: "Send Us a Message",
  },
  {
    key: "pollen.contact.form-description",
    label: "Form Description",
    description: "Description for the contact form",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-full",
    defaultValue: "We'd love to hear from you!",
    placeholder: "We'll get back to you as soon as possible.",
  },
  {
    key: "pollen.contact.form-image",
    label: "Form Image",
    description: "Image for the contact form",
    type: "image",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

export const pollenContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.main",
    title: "Contact Form",
    description: "Update the verbiage and image for the contact form",
    icon: "📝",
    columns: 1,
  },
];

export const pollenContactData = [...contactPageData];
