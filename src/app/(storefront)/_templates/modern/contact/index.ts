import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactPageData: TemplateField[] = [
  {
    key: "modern.contact.page-tagline",
    label: "Page Tagline",
    description: "Tagline for the page",
    type: "text",
    page: "contact",
    group: "contact.main",
    defaultValue: "Get in Touch",
    placeholder: "e.g. Get in Touch",
  },
  {
    key: "modern.contact.page-header",
    label: "Page Header",
    description: "Title for the header section",
    type: "text",
    page: "contact",
    group: "contact.main",
    defaultValue: "We'd love to hear from you",
    placeholder: "e.g. We'd love to hear from you",
  },
  {
    key: "modern.contact.page-description",
    label: "Page Description",
    description: "Description for the header section",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    defaultValue:
      "Whether you have a question about an order, want to learn more about our products, or are interested in a partnership, we're here to help.",
    placeholder: "e.g. A short intro paragraph for your contact page...",
  },
];

const contactInfoData: TemplateField[] = [
  {
    key: "modern.contact.info-title",
    label: "Info Section Title",
    description: "Title for the contact information section",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Contact Information",
    placeholder: "Contact Information",
  },
  {
    key: "modern.contact.info-description",
    label: "Info Section Description",
    description: "Description for the contact information section",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    defaultValue:
      "Reach out through any of these channels and we'll get back to you as soon as possible.",
    placeholder: "Short blurb about how to reach you...",
  },
];

const contactFormData: TemplateField[] = [
  {
    key: "modern.contact.form-title",
    label: "Form Title",
    description: "Title for the contact form section",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: "Send us a message",
    placeholder: "e.g. Send us a message",
  },
  {
    key: "modern.contact.form-description",
    label: "Form Description",
    description: "Description for the contact form section",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    defaultValue: "We'll get back to you as soon as possible.",
    placeholder: "e.g. We'll get back to you as soon as possible.",
  },
];
const contactPageQuestionsData: TemplateField[] = [
  {
    key: "modern.contact.faq-tagline",
    label: "FAQ Tagline",
    description: "Tagline for the FAQ section",
    type: "text",
    page: "contact",
    group: "contact.questions",
    defaultValue: "Common Questions",
    placeholder: "e.g. Common Questions",
  },
  {
    key: "modern.contact.faq-heading",
    label: "FAQ Title",
    description: "Title for the FAQ section",
    type: "text",
    page: "contact",
    group: "contact.questions",
    defaultValue: "Frequently Asked",
    placeholder: "e.g. Frequently Asked",
  },

  {
    key: "modern.contact.faq-list",
    label: "FAQ List",
    description: "List of FAQ items",
    type: "list",
    page: "contact",
    group: "contact.questions",
    itemSchema: [
      {
        key: "question",
        label: "Question",
        type: "text",
        description: "Question",
      },
      {
        key: "answer",
        label: "Answer",
        type: "textarea",
        description: "Answer",
      },
    ],
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
    title: "Contact Main",
    description: "Main section for the contact page",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact information for your business",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact Form",
    description: "Contact form for your business",
    icon: "📝",
    columns: 2,
  },
  {
    id: "contact.questions",
    title: "Contact Questions",
    description: "Add some frequently asked questions for your business",
    icon: "💬",
    columns: 1,
  },
];

export const DEFAULT_MODERN_CONTACT_FAQ = [
  {
    question: "What is your return policy?",
    answer:
      "We offer a 30-day return policy on all items in their original condition. Simply contact us to initiate a return and we'll provide a prepaid shipping label.",
  },
  {
    question: "How long does shipping take?",
    answer:
      "Standard shipping takes 5-7 business days. We also offer expedited shipping (2-3 business days) at checkout for an additional fee.",
  },
  {
    question: "Do you ship internationally?",
    answer:
      "Yes! We ship to over 40 countries. International shipping typically takes 10-15 business days. Duties and taxes may apply depending on your location.",
  },
  {
    question: "Can I modify or cancel an order?",
    answer:
      "Orders can be modified or cancelled within 2 hours of placement. After that, please contact us and we'll do our best to accommodate your request.",
  },
];
