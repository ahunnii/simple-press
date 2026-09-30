import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Field / group / section module for the `pink` template's Contact page.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * Contact". The form uses the shared `useContactForm` hook + hCaptcha (see
 * `pink-contact-form.tsx`) — never reimplemented here. Studio address/
 * email/phone come from Settings → General and hours from Settings → Hours
 * (`Business.businessHours`), never from a literal field default — see the
 * `contact.studio` section's `links` below.
 */

// ─── Built-in list defaults ─────────────────────────────────────────────────
// Text copied verbatim from the pre-migration `DEFAULT_TOPICS` /
// `DEFAULT_SHORTCUTS` constants in `pink-contact-form.tsx` /
// `pink-contact-page.tsx`.

const PINK_CONTACT_TOPICS_DEFAULT_ROWS = [
  {
    name: "Custom orders",
    blurb: "A doll, a piece of jewelry, or something else made just for you.",
    messageLabel: "Tell me what you have in mind",
    messagePlaceholder: "Sizes, colors, timeline — whatever you've got.",
  },
  {
    name: "Make & takes",
    blurb: "Bringing a workshop to your group.",
    messageLabel: "Tell me about your group",
    messagePlaceholder: "Group size, dates that work, and where.",
  },
  {
    name: "Something else",
    blurb: "Questions, press, or anything else.",
    messageLabel: "What's on your mind",
    messagePlaceholder: "Ask away.",
  },
] satisfies Record<string, string>[];

const PINK_CONTACT_SHORTCUTS_DEFAULT_ROWS = [
  { label: "Ask about a make & take", href: "/services" },
  { label: "Browse what's ready now", href: "/shop" },
] satisfies Record<string, string>[];

// ── contact.header ───────────────────────────────────────────────────────────

const contactHeaderData: TemplateField[] = [
  {
    key: "pink.contact.header-heading",
    label: "Heading",
    type: "text",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    description: "The page's H1.",
    defaultValue: "Let's talk about your piece",
  },
  {
    key: "pink.contact.header-intro",
    label: "Intro text",
    type: "textarea",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    description: "One or two sentences under the heading.",
    defaultValue:
      "Questions about an order, a custom order, or booking a make & take — write in and we'll get back to you.",
  },
  {
    key: "pink.contact.header-facts",
    label: "Facts",
    description:
      "Label and value rows beside the heading. Leave empty to show a single Location row built from the city and state in Settings → General; with no city set there, no rows show. Any rows you add here replace it.",
    type: "list",
    page: "contact",
    group: "contact.header",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "fact",
    itemSchema: [
      {
        key: "label",
        label: "Label",
        description: "The small label on the left of the row.",
        type: "text",
        placeholder: "Response time",
      },
      {
        key: "value",
        label: "Value",
        description: "The text on the right of the row.",
        type: "text",
        placeholder: "1–2 business days",
      },
    ],
    defaultValue: "",
  },
];

// ── contact.topics ───────────────────────────────────────────────────────────

const contactTopicsData: TemplateField[] = [
  {
    key: "pink.contact.topics-heading",
    label: "Heading",
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
    itemLabel: "topic",
    defaultsWhenEmpty: true,
    defaultRows: PINK_CONTACT_TOPICS_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "name",
        label: "Name",
        description: "Text on the topic button.",
        type: "text",
        placeholder: "Custom orders",
      },
      {
        key: "blurb",
        label: "Blurb",
        description: "Short line shown under the topic name.",
        type: "textarea",
        optional: true,
        placeholder:
          "A doll, a piece of jewelry, or something else made just for you.",
      },
      {
        key: "messageLabel",
        label: "Message field label",
        description:
          "Replaces the message field's label below when this topic is selected.",
        type: "text",
        optional: true,
        placeholder: "Tell me what you have in mind",
      },
      {
        key: "messagePlaceholder",
        label: "Message field placeholder",
        description:
          "Replaces the message field's placeholder below when this topic is selected.",
        type: "text",
        optional: true,
        placeholder: "Sizes, colors, timeline — whatever you've got.",
      },
    ],
    defaultValue: "",
  },
];

// ── contact.form ─────────────────────────────────────────────────────────────

const contactFormData: TemplateField[] = [
  {
    key: "pink.contact.form-heading",
    label: "Heading",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Heading above the form.",
    defaultValue: "Send a note",
  },
  {
    key: "pink.contact.form-reference-label",
    label: "Reference field label",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description:
      "Label on the optional catch-all field — order number, referral, etc.",
    defaultValue: "Reference (optional)",
  },
  {
    key: "pink.contact.form-reference-placeholder",
    label: "Reference field placeholder",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Placeholder text inside the reference field.",
    defaultValue: "Order #, referral, or anything else",
  },
  {
    key: "pink.contact.form-marketing-label",
    label: "Marketing checkbox text",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    description: "Text beside the marketing opt-in checkbox.",
    defaultValue: "Keep me posted about new pieces and make & takes",
  },
  {
    key: "pink.contact.form-message-label",
    label: "Default message label",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Message field label used when no topic is selected above.",
    defaultValue: "Your message",
  },
  {
    key: "pink.contact.form-message-placeholder",
    label: "Default message placeholder",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description:
      "Message field placeholder used when no topic is selected above.",
    defaultValue:
      "Tell me what you're thinking about — a piece, a date, a question.",
  },
  {
    key: "pink.contact.form-submit-label",
    label: "Submit button text",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    description: "Text on the form's submit button.",
    defaultValue: "Send it",
  },
  {
    key: "pink.contact.form-email-note",
    label: "Email note prefix",
    description: "Static text before your support email, e.g. 'or just email'.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "or just email",
  },
  {
    key: "pink.contact.form-success-heading",
    label: "Success heading",
    description:
      "Heading shown in place of the form after someone sends a message.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Got it — thank you.",
    placeholder: "Message sent",
  },
  {
    key: "pink.contact.form-success-again-label",
    label: "Send another button text",
    description:
      "Button under the success message that brings the form back. Leave blank to hide the button.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send another",
    placeholder: "New message",
  },
  {
    key: "pink.contact.form-success-body",
    label: "Success message",
    description:
      "Line under the success heading after someone sends a message. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "We read every note and reply as soon as we can.",
    placeholder: "Thanks for writing. We'll reply soon.",
  },
];

// ── contact.studio ───────────────────────────────────────────────────────────

const contactStudioData: TemplateField[] = [
  {
    key: "pink.contact.studio-image",
    label: "Photo",
    type: "image",
    page: "contact",
    group: "contact.studio",
    gridColumn: "col-span-full",
    description: "Photo shown above the studio card.",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.contact.studio-label",
    label: "Card label",
    type: "text",
    page: "contact",
    group: "contact.studio",
    gridColumn: "col-span-1",
    description: "Small label at the top of the studio card.",
    defaultValue: "The studio",
  },
  {
    key: "pink.contact.studio-access-note",
    label: "Access note",
    description: "A line about how/when to visit. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.studio",
    gridColumn: "col-span-full",
    defaultValue:
      "Visits by appointment. Message ahead and we'll find a time that works.",
  },
];

// ── contact.shortcuts ────────────────────────────────────────────────────────

const contactShortcutsData: TemplateField[] = [
  {
    key: "pink.contact.shortcuts-heading",
    label: "Heading",
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
    description:
      "Quick links shown before the form. Leave empty to use the defaults.",
    type: "list",
    page: "contact",
    group: "contact.shortcuts",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemLabel: "link",
    defaultsWhenEmpty: true,
    defaultRows: PINK_CONTACT_SHORTCUTS_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "label",
        label: "Label",
        description: "Text on the quick link.",
        type: "text",
        placeholder: "Track an order",
      },
      {
        key: "href",
        label: "Link",
        description: "Where the quick link goes.",
        type: "url",
        placeholder: "/account/orders",
      },
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
    title: "Header",
    description: "Heading, intro text, and fact rows.",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.topics",
    title: "Topics",
    description: "Topic buttons that rewrite the message field below.",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Form",
    description:
      "Labels, placeholders and button text for the contact form, plus the thank-you message shown after it is sent.",
    icon: "📝",
    columns: 2,
  },
  {
    id: "contact.studio",
    title: "Studio",
    description:
      "Photo, label, and access note for the studio aside. Address, hours, phone, and email in the card below them pull from Settings → General and Settings → Hours.",
    icon: "🏠",
    columns: 2,
  },
  {
    id: "contact.shortcuts",
    title: "Shortcuts",
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
    description: "Page header with heading, intro text, and facts.",
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
    links: [SECTION_LINKS.businessContact],
  },
  {
    id: "contact.studio",
    page: "contact",
    title: "Studio",
    description:
      "Studio photo and access note — address, hours, phone, and email are pulled from Settings",
    groupIds: ["contact.studio"],
    order: 3,
    hideable: true,
    links: [
      SECTION_LINKS.businessLocation,
      SECTION_LINKS.businessContact,
      SECTION_LINKS.businessHours,
    ],
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

// ─── Derived storefront constants ──────────────────────────────────────────

export const DEFAULT_PINK_CONTACT_TOPICS = listRowsFromDefaults(
  PINK_CONTACT_TOPICS_DEFAULT_ROWS,
  "default-topic",
);

export const DEFAULT_PINK_CONTACT_SHORTCUTS = listRowsFromDefaults(
  PINK_CONTACT_SHORTCUTS_DEFAULT_ROWS,
  "default-shortcut",
);
