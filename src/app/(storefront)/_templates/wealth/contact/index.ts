import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

const CALENDLY_URL = "https://calendly.com/keyanna1/dcwf-office-hours";

// ─── Contact & Office Hours (hero + closing line) — NOT hideable ───────────

const contactHeroData: TemplateField[] = [
  {
    key: "wealth.contact.hero-image",
    label: "Hero Photo",
    description:
      "Optional photo shown beside the page heading, with a tint. Leave blank for a full-width heading panel with no photo.",
    type: "image",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "wealth.contact.hero-image-alt",
    label: "Hero Photo Alt Text",
    description:
      "Describes the hero photo for screen readers. Leave blank if the photo is purely decorative.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "wealth.contact.hero-heading",
    label: "Page Heading",
    description: "The page's main heading (H1), shown large over the intro.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "Contact & Office Hours",
  },
  {
    key: "wealth.contact.hero-intro-1",
    label: "Intro — Paragraph 1",
    description: "First intro paragraph, shown in italics under the heading.",
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
    description:
      "Second intro paragraph, shown under the first. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "The first step is to schedule an initial meeting.",
  },
  {
    key: "wealth.contact.closing-line",
    label: "Closing Line",
    description:
      "Italic closing line shown centered below the form. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "If these times do not work for you or for other topics, contact us.",
  },
];

// ─── Pathways — three "I want to…" cards — hideable ────────────────────────

const contactPathwaysData: TemplateField[] = [
  {
    key: "wealth.contact.pathway-1-title",
    label: "Pathway 1 — Title",
    description:
      'Heading for the first "I want to…" card. Leave blank to hide the card.',
    type: "text",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-1",
    defaultValue: "I want to apply for financing…",
  },
  {
    key: "wealth.contact.pathway-1-body",
    label: "Pathway 1 — Body",
    description:
      'Body text for pathway 1. When the card has no button, the phrase "Book a consult" links to the URL below.',
    type: "textarea",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-full",
    defaultValue:
      "Book a consult to schedule an intake meeting to apply for financing.",
  },
  {
    key: "wealth.contact.pathway-1-url",
    label: "Pathway 1 — Consult URL",
    description:
      "Where the card's button goes (for example a scheduling page). Leave blank for no button.",
    type: "url",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-1",
    defaultValue: CALENDLY_URL,
  },
  {
    key: "wealth.contact.pathway-2-title",
    label: "Pathway 2 — Title",
    description:
      'Heading for the second "I want to…" card. Leave blank to hide the card.',
    type: "text",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-1",
    defaultValue:
      "I want to learn more about transitioning my business to worker-ownership…",
  },
  {
    key: "wealth.contact.pathway-2-body",
    label: "Pathway 2 — Body",
    description:
      'Body text for pathway 2. When the card has no button, the phrase "Book a consult" links to the URL below.',
    type: "textarea",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-full",
    defaultValue:
      "Book a consult to discuss transitioning your business to worker ownership or selling your business to your employees.",
  },
  {
    key: "wealth.contact.pathway-2-url",
    label: "Pathway 2 — Consult URL",
    description:
      "Where the card's button goes (for example a scheduling page). Leave blank for no button.",
    type: "url",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-1",
    defaultValue: CALENDLY_URL,
  },
  {
    key: "wealth.contact.pathway-3-title",
    label: "Pathway 3 — Title",
    description:
      'Heading for the third "I want to…" card. Leave blank to hide the card.',
    type: "text",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-1",
    defaultValue: "I want to learn more about starting a cooperative…",
  },
  {
    key: "wealth.contact.pathway-3-body",
    label: "Pathway 3 — Body",
    description:
      'Body text for pathway 3. When the card has no button, the phrase "Book a consult" links to the URL below.',
    type: "textarea",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-full",
    defaultValue:
      "Book a consult to discuss starting a cooperative, getting support on democratic management, governance, or operations.",
  },
  {
    key: "wealth.contact.pathway-3-url",
    label: "Pathway 3 — Consult URL",
    description:
      "Where the card's button goes (for example a scheduling page). Leave blank for no button.",
    type: "url",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-1",
    defaultValue: CALENDLY_URL,
  },
  {
    key: "wealth.contact.pathway-cta-label",
    label: "Button Label",
    description:
      'Label on each pathway card\'s button. A card shows its button only when it has a link below. Leave blank to link the words "Book a consult" inside the text instead.',
    type: "text",
    page: "contact",
    group: "contact.pathways",
    gridColumn: "col-span-1",
    defaultValue: "Book a consult",
  },
];

// ─── Contact form — NOT hideable (gated on the platform contactForm flag) ──

const contactFormData: TemplateField[] = [
  {
    key: "wealth.contact.form-heading",
    label: "Form Heading",
    description: "Italic heading beside the contact form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "We love talking co-ops & community ownership.",
  },
  {
    key: "wealth.contact.form-intro",
    label: "Form Lead-in",
    description: "Short line below the form heading. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "For all inquiries, please complete the form.",
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
  ...contactPathwaysData,
  ...contactFormData,
  ...contactInfoData,
];

export const wealthContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Contact & Office Hours",
    description:
      "Page heading and intro at the top, optional photo, and the closing line",
    icon: "🕘",
    columns: 2,
  },
  {
    id: "contact.pathways",
    title: "Consult Pathways",
    description:
      'The three "I want to…" cards, each with a button to book a consult',
    icon: "🧭",
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
    description: "Address and appointment-only note beside the form",
    icon: "📍",
    columns: 2,
  },
];

export const wealthContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Contact & Office Hours",
    description: "Heading, intro, and the closing line",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.pathways",
    page: "contact",
    title: "Consult Pathways",
    description: "Three cards for booking a consult",
    groupIds: ["contact.pathways"],
    order: 1,
    hideable: true,
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Contact Form",
    description: "The platform contact form",
    groupIds: ["contact.form"],
    order: 2,
    hideable: false,
  },
  {
    id: "contact.info",
    page: "contact",
    title: "Office Address",
    description: "Address and appointment-only note",
    groupIds: ["contact.info"],
    order: 3,
    hideable: true,
  },
];
