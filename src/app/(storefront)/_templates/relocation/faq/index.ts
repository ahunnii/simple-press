import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field / group / section module for the `relocation` template's FAQ page
 * (design.md → "Per-page section concepts → FAQ").
 *
 * Two sections:
 *   1. `faq.hero`  — the wave hero.
 *   2. `faq.list`  — the "FAQs" heading + the accordion.
 *
 * The questions and answers themselves are NOT template fields: they are
 * `FaqItem` DB rows managed at /admin/content/faq and passed into the slot as
 * `items` (design.md → Rejected alternatives: "Template-field FAQ … would
 * bypass existing /admin/content/faq management; DB-driven chosen"). Only the
 * chrome around them — heading and the no-items message — is owner-editable
 * here.
 */

// ─── faq.hero ────────────────────────────────────────────────────────────────

const faqHeroData: TemplateField[] = [
  {
    key: "relocation.faq.hero-heading",
    label: "Hero Heading",
    description:
      "The big white headline on the terracotta wave at the top of the FAQ page.",
    type: "text",
    page: "faq",
    group: "faq.hero",
    gridColumn: "col-span-full",
    defaultValue: "Frequently Asked Questions",
  },
  {
    key: "relocation.faq.hero-subheading",
    label: "Hero Paragraph",
    description: "Short intro under the hero headline. Leave blank to hide it.",
    type: "textarea",
    page: "faq",
    group: "faq.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Here are the most commonly asked questions that we've compiled together. If you have any additional questions, contact us!",
  },
  {
    key: "relocation.faq.hero-cta-label",
    label: "Hero Button Label",
    description:
      "Outlined button on the hero. It dials the header call button's phone link. Leave blank to hide the button.",
    type: "text",
    page: "faq",
    group: "faq.hero",
    gridColumn: "col-span-1",
    defaultValue: "CALL US TODAY",
  },
];

// ─── faq.list ────────────────────────────────────────────────────────────────

const faqListData: TemplateField[] = [
  {
    key: "relocation.faq.list-heading",
    label: "Section Heading",
    description:
      "Centered dark heading above the question list. Leave blank to hide it.",
    type: "text",
    page: "faq",
    group: "faq.list",
    gridColumn: "col-span-1",
    defaultValue: "FAQs",
  },
  {
    key: "relocation.faq.empty-message",
    label: "No-Questions Message",
    description:
      "Shown in place of the list while you haven't added any questions yet. Add questions under Content → FAQ.",
    type: "textarea",
    page: "faq",
    group: "faq.list",
    gridColumn: "col-span-full",
    defaultValue: "No questions yet — call us and we'll answer yours directly!",
  },
];

// ─── Aggregated exports ──────────────────────────────────────────────────────

export const relocationFaqData: TemplateField[] = [
  ...faqHeroData,
  ...faqListData,
];

export const relocationFaqFieldGroups: TemplateFieldGroup[] = [
  {
    id: "faq.hero",
    title: "Hero",
    description:
      "Terracotta wave hero at the top of the FAQ page: headline, intro line and call button",
    icon: "🌊",
    columns: 2,
  },
  {
    id: "faq.list",
    title: "FAQs",
    description:
      "Heading above the question list, plus the message shown before you've added any questions. The questions themselves live under Content → FAQ.",
    icon: "❓",
    columns: 2,
  },
];

export const relocationFaqSections: TemplateSection[] = [
  {
    id: "faq.hero",
    page: "faq",
    title: "Hero",
    description:
      "Wave hero with the page headline, intro line and 'Call us today' button",
    groupIds: ["faq.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "faq.list",
    page: "faq",
    title: "FAQs",
    description:
      "'FAQs' heading and the expandable question list (questions come from Content → FAQ)",
    groupIds: ["faq.list"],
    order: 1,
    hideable: false,
  },
];
