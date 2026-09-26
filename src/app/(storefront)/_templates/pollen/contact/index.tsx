import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactPageData: TemplateField[] = [
  {
    key: "pollen.contact.page-title",
    label: "Page title",
    description: "Main heading shown in the contact page hero.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
    placeholder: "Contact Us",
  },
  {
    key: "pollen.contact.page-subtitle",
    label: "Page subtitle",
    description: "Small label shown above the page title.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Let's Talk",
    placeholder: "Let's Talk",
  },
  {
    key: "pollen.contact.form-title",
    label: "Form heading",
    description: "Heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Send us a message",
    placeholder: "Send Us a Message",
  },
  {
    key: "pollen.contact.form-description",
    label: "Form intro",
    description: "Line under the form heading.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "We'd love to hear from you!",
    placeholder: "We'll get back to you as soon as possible.",
  },
  {
    key: "pollen.contact.form-image",
    label: "Photo",
    description: "Photo beside the contact form.",
    type: "image",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pollen.contact.form-success-heading",
    label: "Success heading",
    description:
      "Heading shown in place of the contact form after someone sends a message.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Message sent",
    placeholder: "A short confirmation",
  },
  {
    key: "pollen.contact.form-success-body",
    label: "Success message",
    description:
      "Line under the success heading after someone sends the contact form.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Thanks for reaching out. We'll get back to you soon.",
    placeholder: "Let people know when to expect a reply…",
  },
];

export const pollenContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.main",
    title: "Page heading",
    description:
      "Heading at the top of the contact page. Your address, email, phone, and hours come from Settings.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description:
      "Title, intro, and photo beside the contact form, plus the message shown after it's sent.",
    icon: "✉️",
    columns: 1,
  },
];

export const pollenContactData = [...contactPageData];
