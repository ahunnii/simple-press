import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// Email, phone, address, and hours come from Settings (read in
// elegant-contact-page.tsx). The old per-template overrides
// `elegant.contact.email` / `phone` / `address` and the never-rendered
// `elegant.contact.info-title` were retired 2026-09-27 — see
// RETIRED_TEMPLATE_KEYS in ~/lib/template-fields.

export const elegantContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Hero",
    description: "Small label and heading at the top of the contact page.",
    icon: "📬",
    columns: 1,
  },
  {
    id: "contact.info",
    title: "Contact information",
    description:
      "Intro text above your contact details. Your email, phone, address, and hours come from Settings.",
    icon: "📍",
    columns: 1,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description:
      "Heading, button, and the message shown after someone sends the contact form.",
    icon: "✉️",
    columns: 1,
  },
  {
    id: "contact.faq",
    title: "Questions",
    description: "Common questions answered below the contact form.",
    icon: "❓",
    columns: 1,
  },
];

export const elegantContactData: TemplateField[] = [
  // Hero
  {
    key: "elegant.contact.hero-label",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    defaultValue: "Contact",
    placeholder: "e.g. Say hello",
  },
  {
    key: "elegant.contact.hero-title",
    label: "Heading",
    description: "Large heading at the top of the contact page.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    defaultValue: "Contact Us",
    placeholder: "e.g. Get in touch",
  },
  {
    key: "elegant.contact.hero-subtitle",
    label: "Second line",
    description:
      "Italic line shown under the heading, in the same large type. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    defaultValue: "",
    placeholder: "e.g. We'd love to hear from you",
  },

  // Info
  {
    key: "elegant.contact.info-description",
    label: "Intro text",
    description:
      "Short paragraph above your email, phone, address, and hours. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    defaultValue: "",
    placeholder: "A short note about how to get in touch",
  },

  // Form
  {
    key: "elegant.contact.form-title",
    label: "Heading",
    description: "Heading at the top of the contact form panel.",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Send a Message",
    placeholder: "e.g. Write to us",
  },
  {
    key: "elegant.contact.form-button-label",
    label: "Button label",
    description:
      "Text on the button that sends the form. Blank uses “Send message”.",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Send message",
    placeholder: "e.g. Send",
  },
  {
    key: "elegant.contact.form-success-heading",
    label: "Success heading",
    description:
      "Heading shown in place of the form after someone sends a message. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Thank you.",
    placeholder: "e.g. Message received",
  },
  {
    key: "elegant.contact.form-success-body",
    label: "Success message",
    description:
      "Line under the success heading after someone sends a message. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    defaultValue: "We'll be in touch within a day.",
    placeholder: "e.g. We'll reply within one business day.",
  },
  {
    key: "elegant.contact.form-reset-label",
    label: "Send another label",
    description:
      "Link under the success message that brings the form back. Blank uses “Send another message”.",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Send another message",
    placeholder: "e.g. Write again",
  },

  // FAQ
  {
    key: "elegant.contact.faq-label",
    label: "Small label",
    description: "Short text above the questions heading. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    defaultValue: "FAQ",
    placeholder: "e.g. Good to know",
  },
  {
    key: "elegant.contact.faq-heading",
    label: "Heading",
    description: "Heading above the questions. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    defaultValue: "Questions",
    placeholder: "e.g. Before you write",
  },
  {
    key: "elegant.contact.faq",
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
