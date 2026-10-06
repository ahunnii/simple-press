import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { umscHeroPhotoFields } from "../shared/umsc-hero-fields";

// design.md "Per-page section concepts › Contact": hero (not hideable) →
// form + sticky aside (not hideable — gated on the contactForm flag inside
// the client form) → "Follow on social" (hideable). The custom-order extras
// (product type, quantity, date needed, occasion, scent-or-colour notes) are
// visitor-filled form inputs, not owner-editable copy, so they carry no
// template fields of their own — only the toggle-pill labels are fields, per
// the build brief.

// ─── Hero (contact.hero) ────────────────────────────────────────────────────

const contactHeroData: TemplateField[] = [
  {
    key: "umsc.contact.hero-heading",
    label: "Heading",
    description: "The page's main heading, at the top of the page.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "Say hello, or start a custom order.",
  },
  {
    key: "umsc.contact.hero-lede",
    label: "Subheading",
    description: "One or two sentences beneath the heading.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Questions about a candle, a custom order, or just want to say hi — we're happy to help.",
  },
  ...umscHeroPhotoFields("contact", "contact.hero"),
];

// ─── Form + aside (contact.form) ────────────────────────────────────────────

const contactFormData: TemplateField[] = [
  {
    key: "umsc.contact.form-heading",
    label: "Form heading",
    description: "Heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send a message",
  },
  {
    key: "umsc.contact.toggle-general-label",
    label: "General question toggle label",
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
    label: "Custom order toggle label",
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
    label: "Submit button text",
    description: "Text for the form's submit button.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send message",
  },
  {
    key: "umsc.contact.form-success-heading",
    label: "Success heading",
    description: "Heading shown on the success panel after a message is sent.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Message received",
  },
  {
    key: "umsc.contact.form-success-body",
    label: "Success message",
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
    label: "What to expect heading",
    description: "Heading for the sticky aside beside the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "What to expect",
  },
  {
    key: "umsc.contact.expect-line-1",
    label: "What to expect line 1",
    description: "First short line in the aside. Leave blank to hide it.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "We reply within two business days.",
  },
  {
    key: "umsc.contact.expect-line-2",
    label: "What to expect line 2",
    description: "Second short line in the aside. Leave blank to hide it.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Custom orders start with a quick chat about your vision.",
  },
  {
    key: "umsc.contact.expect-line-3",
    label: "What to expect line 3",
    description: "Third short line in the aside. Leave blank to hide it.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Local pickup and shipping are both available.",
  },
];

// ─── Follow on social (contact.visit, hideable) ─────────────────────────────
// The group/section id and the heading/body keys stay `contact.visit` /
// `umsc.contact.visit-*` so a store's saved show/hide state and copy carry
// over from the old "Visit Our Stores" band.

const contactVisitData: TemplateField[] = [
  {
    key: "umsc.contact.visit-heading",
    label: "Heading",
    description: "Heading above the row of social icons.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-full",
    defaultValue: "Follow Monique",
  },
  {
    key: "umsc.contact.visit-body",
    label: "Message",
    description:
      "Optional line beneath the heading. Leave blank to show only the icons.",
    type: "textarea",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-full",
    defaultValue:
      "New scents, market dates, and pop-up locations land on social first — follow along.",
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
    title: "Hero",
    description: "Page heading, subheading, and an optional photo",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Form",
    description:
      "Form heading, toggle labels, submit and success copy, and the What to expect aside",
    icon: "📝",
    columns: 2,
  },
  {
    id: "contact.visit",
    title: "Follow on social",
    description:
      "Heading and message above the social icons, which come from your social links in Content → Branding",
    icon: "📣",
    columns: 2,
  },
];

export const umscContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Hero",
    description: "Page heading, subheading, and an optional photo",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Form",
    description: "The contact/custom-order form and its What to expect aside",
    groupIds: ["contact.form"],
    order: 1,
    hideable: false,
    links: [
      SECTION_LINKS.businessContact,
      SECTION_LINKS.businessHours,
      SECTION_LINKS.branding,
    ],
  },
  {
    id: "contact.visit",
    page: "contact",
    title: "Follow on social",
    description:
      "A band of large social icons, shown when at least one social link is set in Content → Branding",
    groupIds: ["contact.visit"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.branding],
  },
];
