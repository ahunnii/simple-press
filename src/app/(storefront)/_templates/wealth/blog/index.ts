import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Field/group/section registry for wealth's `BlogPage` + `BlogPostPage` slots
 * ("News + Notes" — design.md → "Per-page section concepts › Blog").
 *
 * Exported FLAT per the Phase 3 export contract — `_templates/wealth/index.ts`
 * and a future `sections.ts` (both locked for this agent) are expected to
 * spread `wealthBlogData` / `wealthBlogFieldGroups` / `wealthBlogSections`
 * into their own aggregation, mirroring `pink/blog/index.ts`.
 *
 * Group naming: `blog.index` (index masthead heading/intro + designed empty
 * state) and `blog.cta` (the post-footer CTA, shared across every post) —
 * chosen over vii's `blog.hero`/`blog.cta` naming because "index" reads more
 * accurately for a page whose hero IS the index masthead (no separate cover
 * story). Field granularity mirrors vii's blog domain (4 index fields + 6 CTA
 * fields = 10 total).
 *
 * The blog-post-context section keeps the platform-wide `blog.post` id
 * convention (asserted by `template-sections.test.ts` for curated templates)
 * even though its single group is named `blog.cta`.
 */

export const wealthBlogData: TemplateField[] = [
  // ── blog.index (not hideable — heading/intro/empty state) ────────────────
  {
    key: "wealth.blog.heading",
    label: "Blog Heading",
    description: "The main title on the News + Notes index page.",
    type: "text",
    page: "blog",
    group: "blog.index",
    gridColumn: "col-span-1",
    defaultValue: "News + Notes",
  },
  {
    key: "wealth.blog.intro",
    label: "Intro Text",
    description:
      "Short line under the title introducing the blog. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.index",
    gridColumn: "col-span-full",
    defaultValue:
      "Updates on our lending, our members, and the movement for community-controlled wealth in Detroit.",
  },
  {
    key: "wealth.blog.empty-heading",
    label: "Empty State Heading",
    description: "Shown when there are no published posts yet.",
    type: "text",
    page: "blog",
    group: "blog.index",
    gridColumn: "col-span-1",
    defaultValue: "No posts yet.",
  },
  {
    key: "wealth.blog.empty-body",
    label: "Empty State Body",
    description:
      "One line under the empty-state heading. A link back to the homepage is always shown beneath it.",
    type: "textarea",
    page: "blog",
    group: "blog.index",
    gridColumn: "col-span-full",
    defaultValue: "Meanwhile, find DCWF in the news on our homepage.",
  },
  {
    key: "wealth.blog.empty-cta-label",
    label: "Empty State Link Label",
    description: "Text of the homepage link under the empty-state message.",
    type: "text",
    page: "blog",
    group: "blog.index",
    gridColumn: "col-span-1",
    defaultValue: "Back to the homepage",
  },

  // ── blog.cta (hideable, renders at the end of every post) ────────────────
  {
    key: "wealth.blog.cta-enabled",
    label: "Show Post CTA",
    description:
      "Toggle the call-to-action block shown at the bottom of every blog post.",
    type: "boolean",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-full",
    defaultValue: "true",
  },
  {
    key: "wealth.blog.cta-overline",
    label: "CTA Overline",
    description: "Small uppercase mono label above the CTA heading.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Get Involved",
  },
  {
    key: "wealth.blog.cta-heading",
    label: "CTA Heading",
    description: "Italic heading in the call-to-action block after posts.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Let's build wealth together.",
  },
  {
    key: "wealth.blog.cta-body",
    label: "CTA Body Text",
    description: "One or two sentences inviting the reader to reach out.",
    type: "textarea",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Reach out to learn about financing, membership, and partnership with DCWF.",
  },
  {
    key: "wealth.blog.cta-button-text",
    label: "CTA Button Text",
    description: "Label for the call-to-action button.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
  },
  {
    key: "wealth.blog.cta-button-link",
    label: "CTA Button Link",
    description: "URL the CTA button links to.",
    type: "url",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

export const wealthBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.index",
    title: "Blog Index",
    description:
      "Heading, intro, and the designed empty state shown on the News + Notes index page.",
    icon: "📰",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "blog.cta",
    title: "Blog Post Call to Action",
    description:
      "A call-to-action shown at the bottom of every blog post. Configure the overline, heading, body copy, and button.",
    icon: "📣",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

export const wealthBlogSections: TemplateSection[] = [
  {
    id: "blog.index",
    page: "blog",
    title: "Blog Index",
    description: "Heading, intro, and the empty state on the News + Notes page.",
    groupIds: ["blog.index"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.blog],
  },
  // Blog-post context is ONE section by platform convention — the id must
  // stay `blog.post` even though its single group is `blog.cta` (see
  // `template-sections.test.ts`'s "exactly one blog-post-context section
  // with id 'blog.post'" assertion for curated templates).
  {
    id: "blog.post",
    page: "blog",
    renderContext: "blog-post",
    title: "Blog Post — Call to Action",
    description: "The closing call-to-action shown at the end of every post.",
    groupIds: ["blog.cta"],
    order: 1,
    hideable: true,
  },
];
