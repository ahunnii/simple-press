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
  // ─── CTA fields ────────────────────────────────────────────────────────────
  {
    key: "vii.blog.cta-enabled",
    label: "Show Post CTA",
    description:
      "Toggle the call-to-action block shown at the bottom of every blog post. Disable to end posts after the related stories grid.",
    type: "boolean",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-full",
    defaultValue: "true",
  },
  {
    key: "vii.blog.cta-overline",
    label: "CTA Overline",
    description:
      "Small uppercase label above the heading — typically the studio name or a short phrase.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "The Studio",
  },
  {
    key: "vii.blog.cta-heading",
    label: "CTA Heading",
    description:
      "Main serif heading of the call-to-action block at the bottom of every post.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Come see us",
  },
  {
    key: "vii.blog.cta-body",
    label: "CTA Body Text",
    description:
      "One or two sentences beneath the heading that invite the reader to take action.",
    type: "textarea",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Book a facial or reach out — we'd love to help you find your glow.",
  },
  {
    key: "vii.blog.cta-button-text",
    label: "CTA Button Text",
    description: "Label for the call-to-action button.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book a visit",
  },
  {
    key: "vii.blog.cta-button-link",
    label: "CTA Button Link",
    description: "URL the CTA button links to.",
    type: "url",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
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

export const viiBlogCtaFieldGroup: TemplateFieldGroup = {
  id: "blog.cta",
  title: "Blog Post Call to Action",
  description:
    "A call-to-action shown at the bottom of every blog post. Configure the overline, heading, body copy, and button.",
  icon: "📣",
  columns: 2,
};
