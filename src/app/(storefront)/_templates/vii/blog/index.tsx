import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Blog ─────────────────────────────────────────────────────────────────────

export const viiBlogFields: TemplateField[] = [
  {
    key: "vii.blog.hero-image",
    label: "Cover Story Image",
    description:
      "Optional image for the large featured 'cover story' at the top of the Journal. Leave blank to use the latest post's own image.",
    type: "image",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.blog.heading",
    label: "Journal Heading",
    description: "The main masthead title for the Journal page.",
    type: "text",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-1",
    defaultValue: "The",
  },
  {
    key: "vii.blog.heading-accent",
    label: "Heading Accent Word",
    description:
      "Italic copper accent word that follows the main heading (renders large in the masthead). Leave blank to hide.",
    type: "text",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-1",
    defaultValue: "Journal",
  },
  {
    key: "vii.blog.intro",
    label: "Intro Text",
    description:
      "Short paragraph in the masthead, beneath the title — introduces your journal to visitors.",
    type: "textarea",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Stories from the studio — skin wisdom, seasonal rituals, and the small practices that make a lasting difference.",
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const viiBlogFieldGroup: TemplateFieldGroup = {
  id: "blog.hero",
  title: "Journal Page",
  description:
    "Masthead heading, accent word, intro text, and an optional cover-story image for the Journal listing page",
  icon: "📖",
  columns: 2,
};
