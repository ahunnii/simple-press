import type {
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field / group / section module for the `pink` template's Contact page.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * Contact". The form uses the shared `useContactForm` hook + hCaptcha (see
 * `pink-contact-form.tsx`) — never reimplemented here. Studio address/
 * email/phone come from business settings and hours from
 * `Business.businessHours`, never from a literal field default.
 */

// ── contact.header ───────────────────────────────────────────────────────────

const contactHeaderData: TemplateField[] = [
  {
    key: "pink.contact.header-eyebrow",
    label: "Header Eyebrow",
    type: "text",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-1",
    description: "Small label above the heading.",
    defaultValue: "Say hello",
  },
  {
    key: "pink.contact.header-heading",
    label: "Header Heading",
    type: "text",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    description: "The page's H1.",
    defaultValue: "Let's talk about your piece",
  },
  {
    key: "pink.contact.header-intro",
    label: "Header Intro",
    type: "textarea",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    description: "One or two sentences under the heading.",
    defaultValue:
      "Questions about an order, a commission, or booking a make & take — write in and we'll get back to you.",
  },
  {
    key: "pink.contact.header-facts",
    label: "Header Facts",
    description: "Label/value rows on the right of the header. Leave empty to use the defaults.",
    type: "list",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Response time" },
      { key: "value", label: "Value", type: "text", placeholder: "1–2 business days" },
    ],
    defaultValue: "",
  },
];

// ── contact.topics ───────────────────────────────────────────────────────────

const contactTopicsData: TemplateField[] = [
  {
    key: "pink.contact.topics-heading",
    label: "Topics Heading",
    type: "text",
    page: "contact",
    group: "contact.topics",
    gridColumn: "col-span-full",
    description: "Heading above the topic buttons.",
    defaultValue: "What's this about?",
  },
  {
    key: "pink.contact.topics-items",
    label: "Topics",
    description:
      "Up to 6 topic buttons. Selecting one rewrites the message field's label and placeholder below. Leave empty to use the defaults.",
    type: "list",
    page: "contact",
    group: "contact.topics",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      { key: "name", label: "Name", type: "text", placeholder: "Custom orders" },
      { key: "blurb", label: "Blurb", type: "textarea", placeholder: "A spirit doll or piece made just for you." },
      { key: "messageLabel", label: "Message Field Label", type: "text", placeholder: "Tell me what you have in mind" },
      { key: "messagePlaceholder", label: "Message Field Placeholder", type: "text", placeholder: "Sizes, colors, timeline — whatever you've got." },
    ],
    defaultValue: "",
  },
];

// ── contact.form ─────────────────────────────────────────────────────────────

const contactFormData: TemplateField[] = [
  {
    key: "pink.contact.form-heading",
    label: "Form Heading",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Heading above the form.",
    defaultValue: "Send a note",
  },
  {
    key: "pink.contact.form-reference-label",
    label: "Reference Field Label",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Optional catch-all field — order number, referral, etc.",
    defaultValue: "Reference (optional)",
  },
  {
    key: "pink.contact.form-reference-placeholder",
    label: "Reference Field Placeholder",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Placeholder text inside the reference field.",
    defaultValue: "Order #, referral, or anything else",
  },
  {
    key: "pink.contact.form-marketing-label",
    label: "Marketing Opt-in Label",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    description: "Text beside the marketing opt-in checkbox.",
    defaultValue: "Keep me posted about new pieces and make & takes",
  },
  {
    key: "pink.contact.form-message-label",
    label: "Default Message Field Label",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Used when no topic is selected above.",
    defaultValue: "Your message",
  },
  {
    key: "pink.contact.form-message-placeholder",
    label: "Default Message Field Placeholder",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Used when no topic is selected above.",
    defaultValue: "Tell me what you're thinking about — a piece, a date, a question.",
  },
  {
    key: "pink.contact.form-submit-label",
    label: "Submit Button Text",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Text on the form's submit button.",
    defaultValue: "Send it",
  },
  {
    key: "pink.contact.form-email-note",
    label: "Email Fallback Prefix",
    description: "Static text before your support email, e.g. 'or just email'.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "or just email",
  },
];

// ── contact.studio ───────────────────────────────────────────────────────────

const contactStudioData: TemplateField[] = [
  {
    key: "pink.contact.studio-image",
    label: "Studio Photo",
    type: "image",
    page: "contact",
    group: "contact.studio",
    gridColumn: "col-span-full",
    description: "Photo shown above the studio card.",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.contact.studio-label",
    label: "Studio Card Label",
    type: "text",
    page: "contact",
    group: "contact.studio",
    gridColumn: "col-span-1",
    description: "Small uppercase label at the top of the studio card.",
    defaultValue: "The studio",
  },
  {
    key: "pink.contact.studio-access-note",
    label: "Access Note",
    description: "A line about how/when to visit. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.studio",
    gridColumn: "col-span-full",
    defaultValue: "Visits by appointment. Message ahead and we'll find a time that works.",
  },
];

// ── contact.shortcuts ────────────────────────────────────────────────────────

const contactShortcutsData: TemplateField[] = [
  {
    key: "pink.contact.shortcuts-heading",
    label: "Shortcuts Heading",
    type: "text",
    page: "contact",
    group: "contact.shortcuts",
    gridColumn: "col-span-full",
    description: "Heading above the quick-links box.",
    defaultValue: "Before you write",
  },
  {
    key: "pink.contact.shortcuts-items",
    label: "Shortcuts",
    description: "Quick links shown before the form. Leave empty to use the defaults.",
    type: "list",
    page: "contact",
    group: "contact.shortcuts",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      { key: "label", label: "Label", type: "text", placeholder: "Track an order" },
      { key: "href", label: "Link", type: "url", placeholder: "/account/orders" },
    ],
    defaultValue: "",
  },
];

// ── Aggregated export ────────────────────────────────────────────────────────

export const pinkContactData: TemplateField[] = [
  ...contactHeaderData,
  ...contactTopicsData,
  ...contactFormData,
  ...contactStudioData,
  ...contactShortcutsData,
];

export const pinkContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.header",
    title: "Contact — Header",
    description: "Eyebrow, heading, intro, and fact rows.",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.topics",
    title: "Contact — Topics",
    description: "Topic buttons that rewrite the message field below.",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact — Form",
    description: "Labels, placeholders and button text for the contact form.",
    icon: "📝",
    columns: 2,
  },
  {
    id: "contact.studio",
    title: "Contact — Studio",
    description: "Photo, label, and access note for the studio aside.",
    icon: "🏠",
    columns: 2,
  },
  {
    id: "contact.shortcuts",
    title: "Contact — Shortcuts",
    description: "Quick links shown before the form.",
    icon: "🔗",
    columns: 1,
  },
];

export const pinkContactSections: TemplateSection[] = [
  {
    id: "contact.header",
    page: "contact",
    title: "Header",
    description: "Page header with eyebrow, heading, intro, and facts.",
    groupIds: ["contact.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.topics",
    page: "contact",
    title: "Topics",
    description: "Topic-select buttons above the form.",
    groupIds: ["contact.topics"],
    order: 1,
    hideable: true,
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Form",
    description: "The contact form itself.",
    groupIds: ["contact.form"],
    order: 2,
    hideable: false,
  },
  {
    id: "contact.studio",
    page: "contact",
    title: "Studio",
    description: "Studio photo, address, hours, and contact links.",
    groupIds: ["contact.studio"],
    order: 3,
    hideable: true,
  },
  {
    id: "contact.shortcuts",
    page: "contact",
    title: "Shortcuts",
    description: "Quick links box before the form.",
    groupIds: ["contact.shortcuts"],
    order: 4,
    hideable: true,
  },
];
