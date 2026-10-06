import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Contact (ContactPage slot, `/contact`) — a simple "Ask a question" page;
 * the Estimate Quote intake lives on the Forms-built `/estimate` page
 * (`DREAM_QUOTE_HREF`). Three sections: hero (not hideable),
 * form (not hideable — gated on the platform `contactForm` flag instead),
 * info (hideable — email/phone/hours/service-area come from the
 * `global.branding` fields already defined in the template root; this
 * group only owns the section's own heading).
 */

// ─── Hero — NOT hideable ────────────────────────────────────────────────────

const contactHeroData: TemplateField[] = [
  {
    key: "dream.contact.hero-heading",
    label: "Heading",
    description: "The page's H1, before the highlighted words.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Contact",
  },
  {
    key: "dream.contact.hero-accent",
    label: "Highlighted words",
    description: "Script-styled phrase after the heading.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "us",
  },
  {
    key: "dream.contact.hero-lede",
    label: "Intro",
    description: "Short line under the page heading.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Have a question for Selest? Send a quick note — she'll get back to you within 24 hours.",
  },
];

// ─── Form — NOT hideable (gated on the platform contactForm flag) ──────────

const contactFormData: TemplateField[] = [
  {
    key: "dream.contact.form-heading",
    label: "Heading",
    description: "Heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Ask a question",
  },
  {
    key: "dream.contact.form-intro",
    label: "Intro",
    description: "Short line under the form heading. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "Questions about packages, rentals or availability — ask away.",
  },
  {
    key: "dream.contact.form-submit-label",
    label: "Submit button label",
    description: "Label for the form's submit button.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send message",
  },
  {
    key: "dream.contact.form-success-heading",
    label: "Success heading",
    description: "Heading shown after a message sends successfully.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Your message is with Selest",
  },
  {
    key: "dream.contact.form-success-body",
    label: "Success message",
    description: "Short line shown after a message sends successfully.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "Thank you for reaching out to Dream Your Theme. Selest will get back to you within 24 hours.",
  },
  {
    key: "dream.contact.event-card-heading",
    label: "Event card heading",
    description:
      "Heading of the card beside the form that points event requests to the Estimate Quote page.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Planning an event?",
  },
  {
    key: "dream.contact.event-card-body",
    label: "Event card text",
    description: "Short line under the event card heading.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "For a full Estimate Quote, tell Selest about your date, venue, theme and colors — she'll recommend the right setup.",
  },
  {
    key: "dream.contact.event-card-cta-label",
    label: "Event card button label",
    description: "Label for the button that opens the Estimate Quote page.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Request an Estimate Quote",
  },
];

// ─── Info — hideable (email/phone/hours/service-area are global fields) ────

const contactInfoData: TemplateField[] = [
  {
    key: "dream.contact.info-heading",
    label: "Heading",
    description: "Heading above the email/phone/hours/service-area lines.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "Get in touch",
  },
];

// ─── Aggregated export ──────────────────────────────────────────────────────

export const dreamContactData: TemplateField[] = [
  ...contactHeroData,
  ...contactFormData,
  ...contactInfoData,
];

export const dreamContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Page header",
    description: "Heading, highlighted words, and intro",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description:
      'Form heading/intro, submit label, success copy, and the "Planning an event?" card',
    icon: "📝",
    columns: 2,
  },
  {
    id: "contact.info",
    title: "Contact info",
    description: "Heading above the email/phone/hours/service-area lines",
    icon: "📍",
    columns: 2,
  },
];

export const dreamContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Page header",
    description: "Logo, heading, and intro",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Contact form",
    description: 'The contact form and its "Planning an event?" card',
    groupIds: ["contact.form"],
    order: 1,
    hideable: false,
  },
  {
    id: "contact.info",
    page: "contact",
    title: "Contact info",
    description:
      "Your heading, plus email, phone, and hours from Settings and your service area — hidden when all are blank",
    groupIds: ["contact.info"],
    links: [SECTION_LINKS.businessContact, SECTION_LINKS.businessHours],
    order: 2,
    hideable: true,
  },
];
