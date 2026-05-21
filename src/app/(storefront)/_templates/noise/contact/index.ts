import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Contact Page ─────────────────────────────────────────────────────────────

const contactPageData: TemplateField[] = [
  {
    key: "noise.contact.header",
    label: "Contact Page Header",
    description: "Heading shown on the contact page",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
  },
  {
    key: "noise.contact.subheader",
    label: "Contact Page Subheader",
    description: "Short intro below the contact heading",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue:
      "We'd love to hear from you. Reach out about custom orders, collaborations, or just to say hello.",
  },
  {
    key: "noise.contact-image",
    label: "Contact Page Image",
    description: "Editorial image displayed alongside the contact form",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
  },
];

const contactFaqData: TemplateField[] = [
  {
    key: "noise.contact-faq-title",
    label: "FAQ Section Title",
    description: "Heading for the FAQ accordion section",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Questions & Answers",
  },
  {
    key: "noise.contact-faq-subtitle",
    label: "FAQ Section Subtitle",
    description: "Short intro text below the FAQ heading",
    type: "textarea",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Can't find what you're looking for? Send us a message.",
  },
  {
    key: "noise.contact-frequently-asked-questions",
    label: "Frequently Asked Questions",
    description: "List of Q&A pairs for the FAQ accordion",
    type: "list",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    maxItems: 10,
    itemSchema: [
      {
        key: "question",
        label: "Question",
        type: "text",
        placeholder: "e.g. Do you accept custom orders?",
      },
      {
        key: "answer",
        label: "Answer",
        type: "textarea",
        placeholder: "e.g. Yes! We love creating one-of-a-kind pieces.",
      },
    ],
  },
];

export const noiseContactData = [...contactPageData, ...contactFaqData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact page header, subheader, and image",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ Section",
    description: "Frequently asked questions accordion",
    icon: "❓",
    columns: 1,
  },
];

export const DEFAULT_FAQ: {
  question: string;
  answer: string;
  _id: string;
}[] = [
  {
    _id: "d1",
    question: "Can I commission a one-of-one piece?",
    answer:
      "Yes. Email us with reference images and a rough silhouette. We respond within two business days with a quote and timeline (usually 4–6 weeks from first fitting to handover).",
  },
  {
    _id: "d2",
    question: "Do you ship internationally?",
    answer:
      "Worldwide, via DHL Express. Duties are calculated at checkout — no surprise fees at the door. Most international orders arrive within 5 business days.",
  },
  {
    _id: "d3",
    question: "Can I visit the atelier?",
    answer:
      "Please do. Book a 45-minute fitting slot via the form above — we'll have your size pulled and tea waiting. Walk-ins welcome on Friday and Saturday afternoons.",
  },
  {
    _id: "d4",
    question: "What's the return policy?",
    answer:
      "14-day exchange on stock pieces. Return postage on us within the US. Numbered editions and commissioned work are final sale.",
  },
  {
    _id: "d5",
    question: "Where are the garments made?",
    answer:
      "Every piece is cut, sewn, and finished in our studio on Gratiot Avenue, Detroit. Fabrics come from mills in Italy, Japan, and one weaver in North Carolina.",
  },
];
