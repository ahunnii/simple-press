import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

const CALENDLY_URL = "https://calendly.com/keyanna1/dcwf-office-hours";

// ─── Contact & Office Hours (hero) — NOT hideable ──────────────────────────

const contactHeroData: TemplateField[] = [
  {
    key: "wealth.contact.hero-heading",
    label: "Page Heading",
    description: "The page's H1.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "Contact & Office Hours",
  },
  {
    key: "wealth.contact.hero-intro-1",
    label: "Intro — Paragraph 1",
    description: "First intro paragraph, left column.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Office Hours are our way of giving focused time to support the development and growth of cooperatives in metro Detroit. Stop by once for an initial consultation, learn about our loan program, or work with us on an ongoing basis to achieve your co-op's goals.",
  },
  {
    key: "wealth.contact.hero-intro-2",
    label: "Intro — Paragraph 2",
    description: "Second intro paragraph, left column.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "The first step is to schedule an initial meeting.",
  },
  {
    key: "wealth.contact.pathway-1-title",
    label: "Pathway 1 — Title",
    description: "Italic heading for the first \"I want to…\" pathway block.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "I want to apply for financing…",
  },
  {
    key: "wealth.contact.pathway-1-body",
    label: "Pathway 1 — Body",
    description:
      "Body text for pathway 1. Include the phrase \"Book a consult\" — it renders as a link to the URL below.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Book a consult to schedule an intake meeting to apply for financing.",
  },
  {
    key: "wealth.contact.pathway-1-url",
    label: "Pathway 1 — Consult URL",
    description: "Where \"Book a consult\" links to for pathway 1.",
    type: "url",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: CALENDLY_URL,
  },
  {
    key: "wealth.contact.pathway-2-title",
    label: "Pathway 2 — Title",
    description: "Italic heading for the second \"I want to…\" pathway block.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "I want to learn more about transitioning my business to worker-ownership…",
  },
  {
    key: "wealth.contact.pathway-2-body",
    label: "Pathway 2 — Body",
    description:
      "Body text for pathway 2. Include the phrase \"Book a consult\" — it renders as a link to the URL below.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Book a consult to discuss transitioning your business to worker ownership or selling your business to your employees.",
  },
  {
    key: "wealth.contact.pathway-2-url",
    label: "Pathway 2 — Consult URL",
    description: "Where \"Book a consult\" links to for pathway 2.",
    type: "url",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: CALENDLY_URL,
  },
  {
    key: "wealth.contact.pathway-3-title",
    label: "Pathway 3 — Title",
    description: "Italic heading for the third \"I want to…\" pathway block.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "I want to learn more about starting a cooperative…",
  },
  {
    key: "wealth.contact.pathway-3-body",
    label: "Pathway 3 — Body",
    description:
      "Body text for pathway 3. Include the phrase \"Book a consult\" — it renders as a link to the URL below.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Book a consult to discuss starting a cooperative, getting support on democratic management, governance, or operations.",
  },
  {
    key: "wealth.contact.pathway-3-url",
    label: "Pathway 3 — Consult URL",
    description: "Where \"Book a consult\" links to for pathway 3.",
    type: "url",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: CALENDLY_URL,
  },
  {
    key: "wealth.contact.closing-line",
    label: "Closing Line",
    description: "Italic closing line below the pathway blocks.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "If these times do not work for you or for other topics, contact us.",
  },
];

// ─── Contact form — NOT hideable (gated on the platform contactForm flag) ──

const contactFormData: TemplateField[] = [
  {
    key: "wealth.contact.form-heading",
    label: "Form Heading",
    description: "Italic heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "We love talking co-ops & community ownership.",
  },
  {
    key: "wealth.contact.form-intro",
    label: "Form Lead-in",
    description: "Short line below the form heading.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "For all inquiries, please complete the form below.",
  },
  {
    key: "wealth.contact.form-submit-label",
    label: "Submit Button Label",
    description: "Label for the SEND button.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send",
  },
  {
    key: "wealth.contact.form-success-heading",
    label: "Success Heading",
    description: "Heading shown after a message sends successfully.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Message sent",
  },
  {
    key: "wealth.contact.form-success-body",
    label: "Success Body",
    description: "Short line shown after a message sends successfully.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "We'll be in touch shortly.",
  },
];

// ─── Info note — hideable ───────────────────────────────────────────────────

const contactInfoData: TemplateField[] = [
  {
    key: "wealth.contact.info-address-line1",
    label: "Address — Line 1",
    description: "First line of the office address.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "9545 Goodwin St",
  },
  {
    key: "wealth.contact.info-address-line2",
    label: "Address — Line 2",
    description: "Second line of the office address.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Detroit, MI 48211",
  },
  {
    key: "wealth.contact.info-appointment-label",
    label: "Appointment Note",
    description: "Italic note below the address (e.g. office-hours policy).",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "By Appointment Only",
  },
];

// ─── Aggregated export ──────────────────────────────────────────────────────

export const wealthContactData: TemplateField[] = [
  ...contactHeroData,
  ...contactFormData,
  ...contactInfoData,
];

export const wealthContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Contact & Office Hours",
    description:
      "Page heading, intro, and the three \"I want to…\" pathway blocks",
    icon: "🕘",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact Form",
    description: "Form heading, lead-in, submit label, and success copy",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.info",
    title: "Office Address",
    description: "Address and appointment-only note",
    icon: "📍",
    columns: 2,
  },
];

export const wealthContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Contact & Office Hours",
    description: "Heading, intro, and the three pathway blocks",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Contact Form",
    description: "The platform contact form",
    groupIds: ["contact.form"],
    order: 1,
    hideable: false,
  },
  {
    id: "contact.info",
    page: "contact",
    title: "Office Address",
    description: "Address and appointment-only note",
    groupIds: ["contact.info"],
    order: 2,
    hideable: true,
  },
];
