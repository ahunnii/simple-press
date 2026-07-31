import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field/group/section registry for pink's `BlogPage` + `BlogPostPage` slots.
 * Exported FLAT (not wrapped in a `{ pink: [...] }` map) per this slot's
 * export contract — the root `_templates/pink/index.ts` / `sections.ts`
 * (both locked for this agent) are expected to spread `pinkBlogData` /
 * `pinkBlogFieldGroups` / `pinkBlogSections` into their own aggregation once
 * every page module is done, mirroring `coop/generic/index.ts`.
 *
 * Authority: docs/templates/pink/design.md → "Per-page section concepts →
 * Blog (index)" and "Blog (post)". Both pages share `page: "blog"`; the two
 * post-only groups (`blog.post-author`, `blog.post-related`) are marked
 * `renderContext: "blog-post"` in the sections below so the editor previews
 * them on an individual post rather than on the blog index.
 *
 * DEVIATIONS from the literal design.md text (see build report for the full
 * reasoning):
 *  - The blog header's right-column CTA is split into its own group
 *    (`blog.subscribe-cta`) rather than folded into `blog.header`, per this
 *    agent's assignment brief — `blog.header` itself (breadcrumb/H1/intro)
 *    is NOT hideable, only the CTA block is.
 *  - `blog.grid`'s "categories derived from the posts" chip row is not
 *    implemented — `Page` has no category/taxonomy column. The hairline chip
 *    row is repurposed as a real Newest/Oldest sort control instead of a
 *    non-functional stand-in.
 *  - The "category eyebrow" shown on cards and the post header reuses the
 *    existing `pink.global.nav-blog` label (default "Journal") rather than
 *    inventing a new field or a fake per-post category.
 */

export const pinkBlogData: TemplateField[] = [
  // ── blog.header (not hideable) ───────────────────────────────────────────
  {
    key: "pink.blog.header-eyebrow",
    label: "Blog Header Eyebrow",
    description: "Small label above the blog index heading.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-1",
    defaultValue: "Notes from the studio",
  },
  {
    key: "pink.blog.header-heading",
    label: "Blog Header Heading",
    description: "Main heading on the blog index page.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-1",
    defaultValue: "The journal",
  },
  {
    key: "pink.blog.header-intro",
    label: "Blog Header Intro",
    description: "One or two lines under the blog heading.",
    type: "textarea",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue:
      "Studio notes, new pieces, and the occasional look at how a doll comes together.",
  },

  // ── blog.subscribe-cta (hideable) ────────────────────────────────────────
  {
    key: "pink.blog.subscribe-heading",
    label: "Follow CTA Heading",
    description:
      "Heading in the right column of the blog header. Leave blank to hide the whole block.",
    type: "text",
    page: "blog",
    group: "blog.subscribe-cta",
    gridColumn: "col-span-full",
    defaultValue: "New pieces go up here first.",
  },
  {
    key: "pink.blog.subscribe-body",
    label: "Follow CTA Supporting Line",
    description: "One short line under the heading. Leave blank to hide.",
    type: "text",
    page: "blog",
    group: "blog.subscribe-cta",
    gridColumn: "col-span-full",
    defaultValue: "One note when there's something new. No noise.",
  },
  {
    key: "pink.blog.subscribe-button",
    label: "Follow CTA Button Text",
    description: "Leave blank to hide the whole block.",
    type: "text",
    page: "blog",
    group: "blog.subscribe-cta",
    gridColumn: "col-span-1",
    defaultValue: "Follow along",
  },
  {
    key: "pink.blog.subscribe-link",
    label: "Follow CTA Button Link",
    description:
      "Where the button goes — a mailing-list signup page, a social profile, or /contact. Never a built-in email signup.",
    type: "url",
    page: "blog",
    group: "blog.subscribe-cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },

  // ── blog.featured (hideable) ─────────────────────────────────────────────
  {
    key: "pink.blog.featured-badge",
    label: "Featured Post Badge",
    description: "Corner badge on the latest-post spotlight card.",
    type: "text",
    page: "blog",
    group: "blog.featured",
    gridColumn: "col-span-1",
    defaultValue: "Latest",
  },

  // ── blog.grid (not hideable — empty state only) ──────────────────────────
  {
    key: "pink.blog.grid-empty-heading",
    label: "Empty Blog Heading",
    description: "Shown when there are no published posts yet.",
    type: "text",
    page: "blog",
    group: "blog.grid",
    gridColumn: "col-span-1",
    defaultValue: "Nothing published yet",
  },
  {
    key: "pink.blog.grid-empty-body",
    label: "Empty Blog Body",
    description: "One line under the empty-blog heading.",
    type: "textarea",
    page: "blog",
    group: "blog.grid",
    gridColumn: "col-span-full",
    defaultValue:
      "Check back soon — new notes from the studio are on the way.",
  },
  {
    key: "pink.blog.grid-empty-cta-label",
    label: "Empty Blog Button Text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "blog",
    group: "blog.grid",
    gridColumn: "col-span-1",
    defaultValue: "Back to the shop",
  },
  {
    key: "pink.blog.grid-empty-cta-link",
    label: "Empty Blog Button Link",
    description: "Where the empty-state button goes.",
    type: "url",
    page: "blog",
    group: "blog.grid",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "pink.blog.search-empty-state",
    label: "Search — No Results Message",
    description:
      "Shown in the post grid when a visitor's search doesn't match any post.",
    type: "text",
    page: "blog",
    group: "blog.grid",
    gridColumn: "col-span-full",
    defaultValue: "No posts match your search.",
  },

  // ── blog.ask (hideable) ──────────────────────────────────────────────────
  {
    key: "pink.blog.ask-eyebrow",
    label: "Ask Band Eyebrow",
    description: "Small label above the closing 'ask a question' band.",
    type: "text",
    page: "blog",
    group: "blog.ask",
    gridColumn: "col-span-1",
    defaultValue: "Questions",
  },
  {
    key: "pink.blog.ask-heading",
    label: "Ask Band Heading",
    description: "Heading in the closing band. Leave blank to hide the band.",
    type: "text",
    page: "blog",
    group: "blog.ask",
    gridColumn: "col-span-full",
    defaultValue: "Got a question about a piece?",
  },
  {
    key: "pink.blog.ask-body",
    label: "Ask Band Body",
    description: "One or two lines under the heading.",
    type: "textarea",
    page: "blog",
    group: "blog.ask",
    gridColumn: "col-span-full",
    defaultValue: "Send a note and it goes straight to the studio.",
  },
  {
    key: "pink.blog.ask-button",
    label: "Ask Band Button Text",
    description: "Leave blank to hide the band.",
    type: "text",
    page: "blog",
    group: "blog.ask",
    gridColumn: "col-span-1",
    defaultValue: "Ask a question",
  },
  {
    key: "pink.blog.ask-link",
    label: "Ask Band Button Link",
    description: "Where the button goes.",
    type: "url",
    page: "blog",
    group: "blog.ask",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },

  // ── blog.post-author (hideable, renderContext: blog-post) ───────────────
  {
    key: "pink.blog.post-author-name",
    label: "Author Name",
    description:
      "Shown in the byline on every post and the author card after the article.",
    type: "text",
    page: "blog",
    group: "blog.post-author",
    gridColumn: "col-span-1",
    defaultValue: "Evelyn Pinkard",
  },
  {
    key: "pink.blog.post-author-role",
    label: "Author Role",
    description: "Small line under the author's name.",
    type: "text",
    page: "blog",
    group: "blog.post-author",
    gridColumn: "col-span-1",
    defaultValue: "Fiber artist, PinkArt LLC",
  },
  {
    key: "pink.blog.post-author-avatar",
    label: "Author Photo",
    description: "Square photo used in the byline and the author card.",
    type: "image",
    page: "blog",
    group: "blog.post-author",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pink.blog.post-author-bio",
    label: "Author Bio",
    description: "One or two sentences in the author card after the article.",
    type: "textarea",
    page: "blog",
    group: "blog.post-author",
    gridColumn: "col-span-full",
    defaultValue:
      "Evelyn has been making spirit dolls and magnets by hand in Detroit for over a decade, one piece at a time.",
  },
  {
    key: "pink.blog.post-author-cta-label",
    label: "Author Card Button Text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "blog",
    group: "blog.post-author",
    gridColumn: "col-span-1",
    defaultValue: "Read her story",
  },
  {
    key: "pink.blog.post-author-cta-link",
    label: "Author Card Button Link",
    description: "Where the author-card button goes.",
    type: "url",
    page: "blog",
    group: "blog.post-author",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },

  // ── blog.post-related (hideable, renderContext: blog-post) ──────────────
  {
    key: "pink.blog.post-related-heading",
    label: "Related Posts Heading",
    description:
      "Heading over the related-posts band at the end of every post.",
    type: "text",
    page: "blog",
    group: "blog.post-related",
    gridColumn: "col-span-1",
    defaultValue: "Keep reading",
  },
];

export const pinkBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.header",
    title: "Blog Header",
    description: "Eyebrow, heading and intro on the blog index.",
    icon: "📰",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "blog.subscribe-cta",
    title: "Blog Header — Follow CTA",
    description:
      "The right column of the blog header. Points at a mailing-list page, social profile, or contact page — never a built-in email signup.",
    icon: "✉️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "blog.featured",
    title: "Featured Post",
    description: "Badge on the latest-post spotlight card.",
    icon: "⭐",
    columns: 1,
  } satisfies TemplateFieldGroup,
  {
    id: "blog.grid",
    title: "Blog Grid — Empty State",
    description: "Shown only when there are no published posts yet.",
    icon: "🗂️",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "blog.ask",
    title: "Ask a Question Band",
    description: "Closing band pointing readers to your contact page.",
    icon: "💬",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "blog.post-author",
    title: "Blog Post — Author",
    description: "Byline and author card shown on every post.",
    icon: "🧵",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "blog.post-related",
    title: "Blog Post — Keep Reading",
    description:
      "Heading over the related-posts band at the end of every post.",
    icon: "📚",
    columns: 1,
  } satisfies TemplateFieldGroup,
];

export const pinkBlogSections: TemplateSection[] = [
  {
    id: "blog.header",
    page: "blog",
    title: "Blog Header",
    description: "Eyebrow, heading and intro on the blog index.",
    groupIds: ["blog.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "blog.subscribe-cta",
    page: "blog",
    title: "Follow CTA",
    description: "Right column of the blog header.",
    groupIds: ["blog.subscribe-cta"],
    order: 1,
    hideable: true,
  },
  {
    id: "blog.featured",
    page: "blog",
    title: "Featured Post",
    description: "Latest-post spotlight card.",
    groupIds: ["blog.featured"],
    order: 2,
    hideable: true,
  },
  {
    id: "blog.grid",
    page: "blog",
    title: "Blog Grid",
    description: "The post grid and its empty state.",
    groupIds: ["blog.grid"],
    order: 3,
    hideable: false,
  },
  {
    id: "blog.ask",
    page: "blog",
    title: "Ask a Question",
    description: "Closing band pointing readers to your contact page.",
    groupIds: ["blog.ask"],
    order: 4,
    hideable: true,
  },
  // Blog-post context is ONE section by platform convention: `noise` and
  // `sledge` both ship a single `blog.post` section, and
  // `template-sections.test.ts` asserts exactly one blog-post-context section
  // with that exact id per curated template. The two underlying field groups
  // stay separate (they are genuinely distinct editable areas) and are both
  // carried in `groupIds`, so no fields are orphaned.
  {
    id: "blog.post",
    page: "blog",
    renderContext: "blog-post",
    title: "Blog Post — Author & Keep Reading",
    description:
      "The byline and author card on every post, plus the related-posts band at the end.",
    groupIds: ["blog.post-author", "blog.post-related"],
    order: 5,
    hideable: true,
  },
];
