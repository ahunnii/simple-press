import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

// Verbatim headings from theluvgluv.com/contact-us. Keys: glove.contact.<name>.
// The live FAQ answers are entered by the owner as Content → FAQ questions.

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const contactFaqData: TemplateField[] = [
  {
    key: "glove.contact.faq-heading",
    label: "Heading",
    description:
      "Heading above the link to your FAQ page. The section stays out of view until at least one question is published (Content → FAQ).",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Frequently asked questions",
  },
  {
    key: "glove.contact.faq-body",
    label: "Text",
    description: "One line under the heading. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue: "Find quick answers about our gloves, sizing and shipping.",
  },
  {
    key: "glove.contact.faq-link-label",
    label: "Button label",
    description:
      "Label of the button that opens the FAQ page. Leave blank to hide it.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Read the FAQ",
  },
];

// ─── Form ─────────────────────────────────────────────────────────────────────

const contactFormData: TemplateField[] = [
  {
    key: "glove.contact.page-title",
    label: "Page title",
    description:
      "Screen-reader and search-engine title of the page. It is not shown on the page itself.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Contact us",
  },
  {
    key: "glove.contact.form-heading",
    label: "Heading",
    description: "Heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "If you have questions, contact us",
  },
  {
    key: "glove.contact.submit-label",
    label: "Button label",
    description: "Label of the send button.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Ask a question",
  },
  {
    key: "glove.contact.success-heading",
    label: "Thank-you heading",
    description: "Heading shown in place of the form after a message is sent.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Thank you for reaching out!",
  },
  {
    key: "glove.contact.success-body",
    label: "Thank-you text",
    description: "Text shown under the thank-you heading. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "Your message is on its way to The LuvGluv team. We will get back to you as soon as we can.",
  },
  {
    key: "glove.contact.unavailable-message",
    label: "Form turned off message",
    description:
      "Shown only when the contact form is switched off and there are no questions or contact details to show.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "Our contact form is taking a short rest. Please check back soon.",
  },
];

// ─── Details ──────────────────────────────────────────────────────────────────

const contactDetailsData: TemplateField[] = [
  {
    key: "glove.contact.details-heading",
    label: "Heading",
    description:
      "Heading above your email, phone and address. Those come from Settings → General. Leave blank to hide the heading.",
    type: "text",
    page: "contact",
    group: "contact.details",
    gridColumn: "col-span-full",
    defaultValue: "Prefer to reach us directly?",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const gloveContactData: TemplateField[] = [
  ...contactFaqData,
  ...contactFormData,
  ...contactDetailsData,
];

export const gloveContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.faq",
    title: "Frequently asked questions",
    description: "Heading and link to the FAQ page, shown beside the form",
    icon: "❓",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description: "Page title, form heading, button label and thank-you message",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.details",
    title: "Contact details",
    description:
      "Heading above your email, phone and address (the details themselves come from Settings)",
    icon: "📞",
    columns: 1,
  },
];

export const gloveContactSections: TemplateSection[] = [
  {
    id: "contact.faq",
    page: "contact",
    title: "Frequently asked questions",
    description:
      "Heading and a link to the FAQ page, on the left. Hidden until a question is published.",
    groupIds: ["contact.faq"],
    order: 0,
    hideable: true,
    links: [SECTION_LINKS.faq],
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Contact form",
    description: "The contact form on the right, with its heading and button.",
    groupIds: ["contact.form"],
    order: 1,
    hideable: false,
  },
  {
    id: "contact.details",
    page: "contact",
    title: "Contact details",
    description:
      "Row with your email, phone and address from Settings, under the form.",
    groupIds: ["contact.details"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.businessContact],
  },
];
