import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactPageData: TemplateField[] = [
  {
    key: "modern.contact.page-tagline",
    label: "Small label",
    description:
      "Short label above the heading at the top of the Contact page.",
    type: "text",
    page: "contact",
    group: "contact.main",
    defaultValue: "Get in Touch",
    placeholder: "e.g. Get in Touch",
  },
  {
    key: "modern.contact.page-header",
    label: "Heading",
    description: "Main heading at the top of the Contact page.",
    type: "text",
    page: "contact",
    group: "contact.main",
    defaultValue: "We'd love to hear from you",
    placeholder: "e.g. We'd love to hear from you",
  },
  {
    key: "modern.contact.page-description",
    label: "Intro text",
    description: "Short paragraph below the heading.",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    defaultValue:
      "Whether you have a question about an order, want to learn more about our products, or are interested in a partnership, we're here to help.",
    placeholder: "A sentence or two inviting people to reach out.",
  },
];

const contactInfoData: TemplateField[] = [
  {
    key: "modern.contact.info-title",
    label: "Heading",
    description: "Heading above your contact details.",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Contact Information",
    placeholder: "e.g. Contact Information",
  },
  {
    key: "modern.contact.info-description",
    label: "Intro text",
    description: "Short text below the contact info heading.",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    defaultValue:
      "Reach out through any of these channels and we'll get back to you as soon as possible.",
    placeholder: "A short line about how to reach you.",
  },
];

const contactFormData: TemplateField[] = [
  {
    key: "modern.contact.form-title",
    label: "Heading",
    description: "Heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Send us a message",
    placeholder: "e.g. Send us a message",
  },
  {
    key: "modern.contact.form-description",
    label: "Intro text",
    description: "Short text below the form heading.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    defaultValue: "We'll get back to you as soon as possible.",
    placeholder: "A sentence assuring visitors you'll respond quickly.",
  },
  {
    key: "modern.contact.form-success-heading",
    label: "Success heading",
    description:
      "Heading shown in place of the contact form after a message is sent.",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Message received",
    placeholder: "e.g. Message received",
  },
  {
    key: "modern.contact.form-success-body",
    label: "Success message",
    description:
      "Text shown under the success heading after a message is sent.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    defaultValue: "Thank you for reaching out. We'll get back to you soon.",
    placeholder: "e.g. Thank you for reaching out. We'll get back to you soon.",
  },
];
const contactPageQuestionsData: TemplateField[] = [
  {
    key: "modern.contact.faq-tagline",
    label: "Small label",
    description: "Short label above the FAQ heading.",
    type: "text",
    page: "contact",
    group: "contact.questions",
    defaultValue: "Common Questions",
    placeholder: "e.g. Common Questions",
  },
  {
    key: "modern.contact.faq-heading",
    label: "Heading",
    description: "Heading above the FAQ list.",
    type: "text",
    page: "contact",
    group: "contact.questions",
    defaultValue: "Frequently Asked",
    placeholder: "e.g. Frequently Asked",
  },

  {
    key: "modern.contact.faq-list",
    label: "Questions",
    description:
      "Pick questions from Content → FAQ. Leave empty to show the first 6 published questions.",
    type: "faq",
    page: "contact",
    group: "contact.questions",
    minItems: 0,
    maxItems: 6,
  },
];

export const modernContactData = [
  ...contactPageData,
  ...contactInfoData,
  ...contactFormData,
  ...contactPageQuestionsData,
];

export const modernContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.main",
    title: "Intro",
    description:
      "Small label, heading, and intro at the top of the Contact page.",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "contact.info",
    title: "Contact info",
    description:
      "Heading and intro for the contact details column. Your email, phone, address, and hours come from Settings.",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description:
      "Heading and intro above the contact form, plus the message shown after it's sent.",
    icon: "📝",
    columns: 2,
  },
  {
    id: "contact.questions",
    title: "FAQ",
    description: "Common questions answered at the bottom of the Contact page.",
    icon: "💬",
    columns: 1,
  },
];
