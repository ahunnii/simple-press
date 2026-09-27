import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactInfoData: TemplateField[] = [
  {
    key: "dark-trend.contact.page-title",
    label: "Page title",
    description:
      "Large title at the top of the contact page, also used in the breadcrumb.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "Contact",
    placeholder: "e.g. Say hello",
  },
  {
    key: "dark-trend.contact.address-label",
    label: "Address label",
    description:
      "Label on the address card. The address itself comes from Settings → General, and the card is hidden when it's blank.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Physical Address",
    placeholder: "e.g. Visit us",
  },
  {
    key: "dark-trend.contact.email-label",
    label: "Email label",
    description:
      "Label on the email card. The email itself comes from Settings → General, and the card is hidden when it's blank.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Email Address",
    placeholder: "e.g. Write to us",
  },
  {
    key: "dark-trend.contact.phone-label",
    label: "Phone label",
    description:
      "Label on the phone card. The number itself comes from Settings → General, and the card is hidden when it's blank.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Phone Number",
    placeholder: "e.g. Call us",
  },
  {
    key: "dark-trend.contact.hours-label",
    label: "Hours label",
    description:
      "Label on the hours card. The hours themselves come from Settings → Hours, and the card is hidden when none are set.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Business Hours",
    placeholder: "e.g. When we're open",
  },
  {
    key: "dark-trend.contact.header",
    label: "Heading",
    description: "Heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Contact Us",
    placeholder: "e.g. Get in touch",
  },
  {
    key: "dark-trend.contact.subheader",
    label: "Small label",
    description: "Short text above the heading.",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Get in Touch",
    placeholder: "e.g. Say hello",
  },
  {
    key: "dark-trend.contact.description",
    label: "Body text",
    description: "Paragraph below the heading, above the contact form.",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    defaultValue:
      "Have a question or a custom request? Send us a message and we'll get back to you shortly.",
    placeholder: "A short intro for your contact page...",
  },
  {
    key: "dark-trend.contact.image",
    label: "Image",
    description: "Photo beside the contact form.",
    type: "image",
    page: "contact",
    group: "contact.info",
    defaultValue: "/placeholder.svg",
  },
];

const contactFormData: TemplateField[] = [
  {
    key: "dark-trend.contact.form-success-heading",
    label: "Success heading",
    description:
      "Heading shown in place of the contact form after someone sends a message.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Message sent successfully!",
    placeholder: "e.g. Thanks, got it!",
  },
  {
    key: "dark-trend.contact.form-success-body",
    label: "Success message",
    description:
      "Line under the success heading after someone sends a message. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "We've received your message and will get back to you soon.",
    placeholder: "A short thank-you and when to expect a reply",
  },
  {
    key: "dark-trend.contact.form-send-another-text",
    label: "Send another button",
    description:
      "Button under the success message that brings the empty form back. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send Another Message",
    placeholder: "e.g. Write again",
  },
];

export const darkTrendContactData: TemplateField[] = [
  ...contactInfoData,
  ...contactFormData,
];

export const darkTrendContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact info",
    description:
      "Page title, card labels, heading, description, and image on the contact page. Your address, email, phone, and hours come from Settings.",
    icon: "📞",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description: "Message shown after someone sends the contact form.",
    icon: "✉️",
    columns: 2,
  },
];
