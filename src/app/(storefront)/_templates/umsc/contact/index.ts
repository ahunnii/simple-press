import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// design.md "Per-page section concepts › Contact": hero (not hideable) →
// form + sticky aside (not hideable — gated on the contactForm flag inside
// the client form) → "Visit Our Stores" (hideable). The custom-order extras
// (product type, quantity, date needed, occasion, scent-or-colour notes) are
// visitor-filled form inputs, not owner-editable copy, so they carry no
// template fields of their own — only the toggle-pill labels are fields, per
// the build brief.

// ─── Hero (contact.hero) ────────────────────────────────────────────────────

const contactHeroData: TemplateField[] = [
  {
    key: "umsc.contact.hero-heading",
    label: "Hero Heading",
    description: "The page title shown on the black page-hero band.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "Say hello, or start a custom order.",
  },
  {
    key: "umsc.contact.hero-lede",
    label: "Hero Lede",
    description: "One sentence beneath the heading.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Questions about a candle, a custom order, or just want to say hi — we're happy to help.",
  },
];

// ─── Form + aside (contact.form) ────────────────────────────────────────────

const contactFormData: TemplateField[] = [
  {
    key: "umsc.contact.form-heading",
    label: "Form Heading",
    description: "Heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send a message",
  },
  {
    key: "umsc.contact.toggle-general-label",
    label: "'General Question' Toggle Label",
    description:
      "Text for the first toggle pill (the default, general-inquiry mode).",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "General question",
  },
  {
    key: "umsc.contact.toggle-custom-label",
    label: "'Custom Order' Toggle Label",
    description:
      "Text for the second toggle pill. Selected automatically when a visitor arrives at /contact?type=custom.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Custom order",
  },
  {
    key: "umsc.contact.form-submit-label",
    label: "Submit Button Text",
    description: "Text for the form's submit button.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send message",
  },
  {
    key: "umsc.contact.form-success-heading",
    label: "Success Heading",
    description: "Heading shown on the success panel after a message is sent.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Message received",
  },
  {
    key: "umsc.contact.form-success-body",
    label: "Success Body Text",
    description: "Copy shown on the success panel after a message is sent.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "Monique will be in touch soon — usually within two business days.",
  },
  {
    key: "umsc.contact.expect-heading",
    label: "'What to Expect' Heading",
    description: "Heading for the sticky aside beside the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "What to expect",
  },
  {
    key: "umsc.contact.expect-line-1",
    label: "'What to Expect' Line 1",
    description: "First short line in the aside. Leave blank to hide it.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "We reply within two business days.",
  },
  {
    key: "umsc.contact.expect-line-2",
    label: "'What to Expect' Line 2",
    description: "Second short line in the aside. Leave blank to hide it.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Custom orders start with a quick chat about your vision.",
  },
  {
    key: "umsc.contact.expect-line-3",
    label: "'What to Expect' Line 3",
    description: "Third short line in the aside. Leave blank to hide it.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Local pickup and shipping are both available.",
  },
  {
    key: "umsc.contact.hours",
    label: "Hours",
    description:
      "Shown in the sticky aside beside the form. Leave blank to hide it.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Mon–Sat: by appointment · Sun: closed",
  },
];

// ─── Visit (contact.visit, hideable) ────────────────────────────────────────

const contactVisitData: TemplateField[] = [
  {
    key: "umsc.contact.visit-heading",
    label: "Visit Heading",
    description: "Heading for the 'Visit Our Stores' band.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-full",
    defaultValue: "Visit Our Stores",
  },
  {
    key: "umsc.contact.visit-body",
    label: "Visit Body Text",
    description:
      "Markets, pop-ups, or store-visit details. Leave blank to hide this section.",
    type: "textarea",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-full",
    defaultValue:
      "Find Unique Monique at local markets and pop-ups around Detroit — follow our socials for the next date and location.",
  },
  {
    key: "umsc.contact.visit-link-label",
    label: "Visit Link Text",
    description: "Text for the link beneath the visit copy.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "See upcoming markets",
  },
  {
    key: "umsc.contact.visit-link-url",
    label: "Visit Link URL",
    description:
      "Where the link points — a socials page or events listing. Leave blank to hide the link.",
    type: "url",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const umscContactData: TemplateField[] = [
  ...contactHeroData,
  ...contactFormData,
  ...contactVisitData,
];

export const umscContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Contact Hero",
    description: "Page-hero heading and lede",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact Form",
    description:
      "Form heading, toggle-pill labels, submit/success copy, and the 'What to expect' aside (lines, hours)",
    icon: "📝",
    columns: 2,
  },
  {
    id: "contact.visit",
    title: "Visit Our Stores",
    description: "Heading, body, and link for markets/pop-ups",
    icon: "📍",
    columns: 2,
  },
];

export const umscContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Hero",
    description: "Page hero with heading and lede",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Form",
    description: "The contact/custom-order form and its 'What to expect' aside",
    groupIds: ["contact.form"],
    order: 1,
    hideable: false,
  },
  {
    id: "contact.visit",
    page: "contact",
    title: "Visit Our Stores",
    description: "Markets/pop-ups band",
    groupIds: ["contact.visit"],
    order: 2,
    hideable: true,
  },
];
