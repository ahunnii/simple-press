import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Blog ─────────────────────────────────────────────────────────────────────

export const viiBlogFields: TemplateField[] = [
  {
    key: "vii.blog.hero-image",
    label: "Cover story photo",
    description:
      "Optional photo for the large featured cover story at the top of the blog. Leave blank to use the latest post's own photo.",
    type: "image",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.blog.heading",
    label: "Heading",
    description: "The main masthead title for the blog page.",
    type: "text",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-1",
    defaultValue: "The",
  },
  {
    key: "vii.blog.heading-accent",
    label: "Heading, highlighted words",
    description:
      "Shown in italics after the heading, large in the masthead. Leave blank to hide.",
    type: "text",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-1",
    defaultValue: "Blog",
  },
  {
    key: "vii.blog.intro",
    label: "Intro text",
    description:
      "Short paragraph in the masthead, beneath the title — introduces your blog to visitors.",
    type: "textarea",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Stories from the studio — skin wisdom, seasonal rituals, and the small practices that make a lasting difference.",
  },
  // ─── Blog post footer fields ────────────────────────────────────────────────
  {
    key: "vii.blog.cta-enabled",
    label: "Show blog post footer",
    description:
      "Toggle the block shown at the bottom of every blog post. Turn off to end posts after the related-stories grid.",
    type: "boolean",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-full",
    defaultValue: "true",
  },
  {
    key: "vii.blog.cta-overline",
    label: "Small label",
    description:
      "Small label above the heading — typically your business name or a short phrase.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "The Studio",
    visibleWhen: { key: "vii.blog.cta-enabled", equals: "true" },
  },
  {
    key: "vii.blog.cta-heading",
    label: "Heading",
    description: "Main heading of the block at the bottom of every post.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Come see us",
    visibleWhen: { key: "vii.blog.cta-enabled", equals: "true" },
  },
  {
    key: "vii.blog.cta-body",
    label: "Body text",
    description:
      "One or two sentences beneath the heading that invite the reader to take action.",
    type: "textarea",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Book a facial or reach out — we'd love to help you find your glow.",
    visibleWhen: { key: "vii.blog.cta-enabled", equals: "true" },
  },
  {
    key: "vii.blog.cta-button-text",
    label: "Button text",
    description: "Text for the button.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book a visit",
    visibleWhen: { key: "vii.blog.cta-enabled", equals: "true" },
  },
  {
    key: "vii.blog.cta-button-link",
    label: "Button link",
    description: "Where the button sends visitors.",
    type: "url",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    visibleWhen: { key: "vii.blog.cta-enabled", equals: "true" },
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const viiBlogFieldGroup: TemplateFieldGroup = {
  id: "blog.hero",
  title: "Blog page",
  description:
    "Masthead heading, highlighted words, intro text, and an optional cover-story photo for the blog listing page",
  icon: "📖",
  columns: 2,
};

export const viiBlogCtaFieldGroup: TemplateFieldGroup = {
  id: "blog.cta",
  title: "Blog post footer",
  description:
    "A block shown at the bottom of every blog post. Configure the small label, heading, body text, and button.",
  icon: "📣",
  columns: 2,
};
