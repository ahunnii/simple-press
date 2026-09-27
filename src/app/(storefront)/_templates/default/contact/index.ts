import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const contactHeaderData: TemplateField[] = [
  {
    key: "default.contact.eyebrow",
    label: "Small label",
    description:
      "Short text above the heading on the Contact page. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.header",
    defaultValue: "Get in touch",
    placeholder: "Get in touch",
  },
  {
    key: "default.contact.heading",
    label: "Heading",
    description: "Main heading at the top of the Contact page.",
    type: "text",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    defaultValue: "Say hello.",
    placeholder: "Say hello.",
  },
  {
    key: "default.contact.description",
    label: "Intro text",
    description:
      "Short line below the heading on the Contact page. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    defaultValue: "I read every message myself and reply as soon as I can.",
    placeholder: "One short sentence",
  },
];

// ── Info cards — email, phone, address, and hours ───────────────────────────
// The VALUES (email address, phone number, street address, hours) always
// come from Settings (never a template field — see field-conventions.md
// "Never duplicate Settings data"). These fields own only the labels/body
// copy shown around those values.
export const DEFAULT_CONTACT_EMAIL_LABEL = "Email";
export const DEFAULT_CONTACT_EMAIL_BODY =
  "For orders, questions, and anything in between.";
export const DEFAULT_CONTACT_EMAIL_LINK_LABEL = "Write to us";
export const DEFAULT_CONTACT_PHONE_LABEL = "Phone";
export const DEFAULT_CONTACT_PHONE_BODY =
  "Call or text us during business hours.";
export const DEFAULT_CONTACT_PHONE_LINK_LABEL = "Call now";
// The address card's copy was neutralized 2026-09-27 (was "Studio" / "Come
// say hi in person.") — the default template has no reason to assume every
// owner works from a studio.
export const DEFAULT_CONTACT_ADDRESS_LABEL = "Visit";
export const DEFAULT_CONTACT_ADDRESS_BODY = "Come see us in person.";
export const DEFAULT_CONTACT_HOURS_LABEL = "Hours";

const contactInfoData: TemplateField[] = [
  {
    key: "default.contact.email-label",
    label: "Email card — small label",
    description: "Small label above your email address in the info sidebar",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: DEFAULT_CONTACT_EMAIL_LABEL,
    placeholder: DEFAULT_CONTACT_EMAIL_LABEL,
  },
  {
    key: "default.contact.email-body",
    label: "Email card — body",
    description: "Short line under your email address",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: DEFAULT_CONTACT_EMAIL_BODY,
    placeholder: "A short line about what to expect",
  },
  {
    key: "default.contact.email-link-label",
    label: "Email card — link text",
    description: "Label for the email card's link",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: DEFAULT_CONTACT_EMAIL_LINK_LABEL,
    placeholder: DEFAULT_CONTACT_EMAIL_LINK_LABEL,
  },
  {
    key: "default.contact.phone-label",
    label: "Phone card — small label",
    description: "Small label above your phone number in the info sidebar",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: DEFAULT_CONTACT_PHONE_LABEL,
    placeholder: DEFAULT_CONTACT_PHONE_LABEL,
  },
  {
    key: "default.contact.phone-body",
    label: "Phone card — body",
    description: "Short line under your phone number",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: DEFAULT_CONTACT_PHONE_BODY,
    placeholder: DEFAULT_CONTACT_PHONE_BODY,
  },
  {
    key: "default.contact.phone-link-label",
    label: "Phone card — link text",
    description: "Label for the phone card's link",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: DEFAULT_CONTACT_PHONE_LINK_LABEL,
    placeholder: DEFAULT_CONTACT_PHONE_LINK_LABEL,
  },
  {
    key: "default.contact.address-label",
    label: "Address card — small label",
    description: "Small label above your address in the info sidebar",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: DEFAULT_CONTACT_ADDRESS_LABEL,
    placeholder: DEFAULT_CONTACT_ADDRESS_LABEL,
  },
  {
    key: "default.contact.address-body",
    label: "Address card — body",
    description: "Short line under your address",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: DEFAULT_CONTACT_ADDRESS_BODY,
    placeholder: DEFAULT_CONTACT_ADDRESS_BODY,
  },
  {
    key: "default.contact.hours-label",
    label: "Hours card — small label",
    description:
      "Small label above your business hours. Shown only when hours are set in Settings.",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: DEFAULT_CONTACT_HOURS_LABEL,
    placeholder: DEFAULT_CONTACT_HOURS_LABEL,
  },
];

// ── Contact form — success state and submit button copy ─────────────────────
export const DEFAULT_CONTACT_FORM_SUCCESS_HEADING =
  "Message sent successfully!";
export const DEFAULT_CONTACT_FORM_SUCCESS_BODY =
  "We've received your message and will get back to you soon.";
export const DEFAULT_CONTACT_FORM_SUCCESS_BUTTON = "Send Another Message";
export const DEFAULT_CONTACT_FORM_SUBMIT_LABEL = "Send Message";

const contactFormData: TemplateField[] = [
  {
    key: "default.contact.form-success-heading",
    label: "Success heading",
    description: "Heading shown after a message is sent successfully",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: DEFAULT_CONTACT_FORM_SUCCESS_HEADING,
    placeholder: DEFAULT_CONTACT_FORM_SUCCESS_HEADING,
  },
  {
    key: "default.contact.form-success-body",
    label: "Success body",
    description: "Supporting line shown below the success heading",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: DEFAULT_CONTACT_FORM_SUCCESS_BODY,
    placeholder: "What happens next, in a few words",
  },
  {
    key: "default.contact.form-success-button",
    label: "Success button text",
    description: "Button label that resets the form to send another message",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: DEFAULT_CONTACT_FORM_SUCCESS_BUTTON,
    placeholder: DEFAULT_CONTACT_FORM_SUCCESS_BUTTON,
  },
  {
    key: "default.contact.form-submit-label",
    label: "Submit button text",
    description: "Label for the form's submit button",
    type: "text",
    page: "contact",
    group: "contact.form",
    defaultValue: DEFAULT_CONTACT_FORM_SUBMIT_LABEL,
    placeholder: DEFAULT_CONTACT_FORM_SUBMIT_LABEL,
  },
];

// ── FAQ heading ───────────────────────────────────────────────────────────
export const DEFAULT_CONTACT_FAQ_EYEBROW = "Frequently asked";
export const DEFAULT_CONTACT_FAQ_HEADING = "Quick answers.";

const contactFaqData: TemplateField[] = [
  {
    key: "default.contact.faq-eyebrow",
    label: "Small label",
    description:
      "Short text above the FAQ heading at the bottom of the Contact page. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    defaultValue: DEFAULT_CONTACT_FAQ_EYEBROW,
    placeholder: DEFAULT_CONTACT_FAQ_EYEBROW,
  },
  {
    key: "default.contact.faq-heading",
    label: "Heading",
    description: "Heading above the FAQ list at the bottom of the Contact page.",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    defaultValue: DEFAULT_CONTACT_FAQ_HEADING,
    placeholder: DEFAULT_CONTACT_FAQ_HEADING,
  },
  {
    key: "default.contact.faq",
    label: "Questions",
    description:
      "Pick questions from Content → FAQ. Leave empty to show the first 6 published questions.",
    type: "faq",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 6,
  },
];

export const defaultContactData: TemplateField[] = [
  ...contactHeaderData,
  ...contactInfoData,
  ...contactFormData,
  ...contactFaqData,
];

export const defaultContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.header",
    title: "Header",
    description: "Heading and tagline for the Contact page",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.info",
    title: "Info cards",
    description:
      "Labels and body copy for the email, phone, address, and hours cards. The email, phone, address, and hours themselves come from Settings.",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Form",
    description: "Submit button and success-message copy for the contact form",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ",
    description:
      "Heading and questions pulled from Content → FAQ, shown below the contact form",
    icon: "❓",
    columns: 2,
  },
];
