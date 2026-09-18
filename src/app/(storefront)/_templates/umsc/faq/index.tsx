import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// FaqPage has no playbook entry (see .claude/skills/sp-new-template/references/page-playbooks.md
// "How to use this file") — built from `_templates/default/faq/default-faq-page.tsx`'s data
// shape (`DefaultFaqPageTemplateProps` = `{ business, items }`, `items` = `api.faq.list()`
// rows) and design.md's "Per-page section concepts → FAQ". Three sections/groups, one per
// visual band: hero, the accordion band (owns the "Good to know" heading + the designed empty
// state per the field-conventions.md/hard-rule-10 "every list has a designed empty state, never
// blank" — a deliberate reading of design.md's terser "Empty: hero + the band only" line, see
// the E-phase3 report), and the hideable closing CTA band.

// ─── Hero (faq.hero) ────────────────────────────────────────────────────────

const faqHeroData: TemplateField[] = [
  {
    key: "umsc.faq.hero-heading",
    label: "Heading",
    description: "The FAQ page's h1.",
    type: "text",
    page: "faq",
    group: "faq.hero",
    gridColumn: "col-span-full",
    defaultValue: "Questions, answered.",
  },
  {
    key: "umsc.faq.hero-lede",
    label: "Lede",
    description:
      "One sentence under the heading, above the phone and contact links.",
    type: "textarea",
    page: "faq",
    group: "faq.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Have a question about an order, a scent, or a custom batch? Call Monique directly, or send a note below.",
  },
  {
    key: "umsc.faq.hero-contact-label",
    label: "Contact Link Text",
    description: "Text for the contact link shown next to the phone number.",
    type: "text",
    page: "faq",
    group: "faq.hero",
    gridColumn: "col-span-1",
    defaultValue: "Send a message",
  },
  {
    key: "umsc.faq.hero-contact-url",
    label: "Contact Link URL",
    description: "URL the contact link points to.",
    type: "url",
    page: "faq",
    group: "faq.hero",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Accordion band (faq.accordion) ─────────────────────────────────────────

const faqAccordionData: TemplateField[] = [
  {
    key: "umsc.faq.list-heading",
    label: "Accordion Heading",
    description:
      'Left-column h2 beside the question list on desktop ("Good to know").',
    type: "text",
    page: "faq",
    group: "faq.accordion",
    gridColumn: "col-span-full",
    defaultValue: "Good to know",
  },
  {
    key: "umsc.faq.empty-state-text",
    label: "Empty State Text",
    description:
      "Shown in place of the accordion when no FAQ items are published yet.",
    type: "textarea",
    page: "faq",
    group: "faq.accordion",
    gridColumn: "col-span-full",
    defaultValue:
      "New answers are on their way. Ask Monique directly and she'll get back to you within two business days.",
  },
  {
    key: "umsc.faq.empty-state-link-label",
    label: "Empty State Link Text",
    description: "Text for the link shown under the empty-state text.",
    type: "text",
    page: "faq",
    group: "faq.accordion",
    gridColumn: "col-span-1",
    defaultValue: "Ask a question",
  },
  {
    key: "umsc.faq.empty-state-link-url",
    label: "Empty State Link URL",
    description: "URL the empty-state link points to.",
    type: "url",
    page: "faq",
    group: "faq.accordion",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Closing CTA band (faq.cta) ─────────────────────────────────────────────

const faqCtaData: TemplateField[] = [
  {
    key: "umsc.faq.cta-heading",
    label: "CTA Heading",
    description: "Heading for the closing cream band.",
    type: "text",
    page: "faq",
    group: "faq.cta",
    gridColumn: "col-span-full",
    defaultValue: "Still have a question?",
  },
  {
    key: "umsc.faq.cta-body",
    label: "CTA Body",
    description: "One line under the CTA heading.",
    type: "textarea",
    page: "faq",
    group: "faq.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "We're happy to help with sizes, scents, ingredients, or a custom order.",
  },
  {
    key: "umsc.faq.cta-button-label",
    label: "CTA Button Text",
    description: "Text for the gold button.",
    type: "text",
    page: "faq",
    group: "faq.cta",
    gridColumn: "col-span-1",
    defaultValue: "Contact us",
  },
  {
    key: "umsc.faq.cta-button-url",
    label: "CTA Button URL",
    description: "URL the gold button points to.",
    type: "url",
    page: "faq",
    group: "faq.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const umscFaqData: TemplateField[] = [
  ...faqHeroData,
  ...faqAccordionData,
  ...faqCtaData,
];

export const umscFaqFieldGroups: TemplateFieldGroup[] = [
  {
    id: "faq.hero",
    title: "Hero",
    description:
      "Heading, lede, and the contact link shown beside the phone number",
    icon: "❓",
    columns: 2,
  },
  {
    id: "faq.accordion",
    title: "Questions",
    description:
      'The "Good to know" heading beside the question list, and the empty state shown when no questions are published yet',
    icon: "📋",
    columns: 2,
  },
  {
    id: "faq.cta",
    title: "Closing CTA",
    description: '"Still have a question?" cream band linking to Contact',
    icon: "💬",
    columns: 2,
  },
];

export const umscFaqSections: TemplateSection[] = [
  {
    id: "faq.hero",
    page: "faq",
    title: "Hero",
    description: "Heading, lede, phone, and a contact link",
    groupIds: ["faq.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "faq.accordion",
    page: "faq",
    title: "Questions",
    description:
      'The question accordion (or its empty state) beside the "Good to know" heading',
    groupIds: ["faq.accordion"],
    order: 1,
    hideable: false,
  },
  {
    id: "faq.cta",
    page: "faq",
    title: "Closing CTA",
    description: '"Still have a question?" cream band linking to Contact',
    groupIds: ["faq.cta"],
    order: 2,
    hideable: true,
  },
];
