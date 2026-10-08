import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Fields, groups and sections for glove's `BlogPage` + `BlogPostPage`.
 * Extrapolated page (the live site has no blog): title band, 3-col cards,
 * single-column post. Both slots share `page: "blog"`; `blog.post` is the
 * post-context section (exactly one, id `blog.post`, per
 * template-sections.test.ts).
 */

export const gloveBlogData: TemplateField[] = [
  // ── blog.header ──────────────────────────────────────────────────────────
  {
    key: "glove.blog.header-title",
    label: "Heading",
    description:
      "Main heading in the title band at the top of the blog. Also names the blog in the breadcrumb on every post.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue: "Blog",
    placeholder: "Blog",
  },
  {
    key: "glove.blog.header-subtitle",
    label: "Intro text",
    description: "One line under the heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue: "Stories, styling ideas and news from The LuvGluv.",
    placeholder: "One short sentence",
  },

  // ── blog.listing ─────────────────────────────────────────────────────────
  {
    key: "glove.blog.listing-read-more",
    label: "Post link text",
    description: "Link text at the bottom of every post card.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    defaultValue: "Continue reading",
    placeholder: "Read the story",
  },
  {
    key: "glove.blog.listing-load-more",
    label: "Load more button",
    description: "Button below the grid when there are more posts to show.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    defaultValue: "Load more posts",
    placeholder: "Show older posts",
  },
  {
    key: "glove.blog.listing-search-empty",
    label: "No search results message",
    description: "Shown when a search matches no posts.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "No posts match your search.",
    placeholder: "Try a different word",
  },
  {
    key: "glove.blog.listing-empty-heading",
    label: "Empty state heading",
    description: "Heading shown while no posts are published.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "No posts yet",
    placeholder: "Nothing here yet",
  },
  {
    key: "glove.blog.listing-empty-body",
    label: "Empty state message",
    description: "Line under the empty-state heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "New stories are on the way. Check back soon.",
    placeholder: "One short sentence",
  },
  {
    key: "glove.blog.listing-empty-cta-label",
    label: "Empty state button text",
    description: "Button under the empty-state message. Leave blank to hide.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    defaultValue: "Back to home",
    placeholder: "Browse the shop",
  },
  {
    key: "glove.blog.listing-empty-cta-link",
    label: "Empty state button link",
    description:
      "Where the empty-state button goes. It hides on its own if the page it points to is switched off.",
    type: "url",
    page: "blog",
    group: "blog.listing",
    defaultValue: "/",
    placeholder: "/shop",
  },

  // ── blog.post (post pages) ───────────────────────────────────────────────
  {
    key: "glove.blog.post-related-heading",
    label: "More posts heading",
    description:
      "Heading above the other posts at the end of every post. Leave blank to hide.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-full",
    defaultValue: "More from the blog",
    placeholder: "Keep reading",
  },
  {
    key: "glove.blog.post-back-label",
    label: "Back link text",
    description: "Button that returns readers to the blog list.",
    type: "text",
    page: "blog",
    group: "blog.post",
    defaultValue: "Back to all posts",
    placeholder: "See every post",
  },
];

export const gloveBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.header",
    title: "Blog heading",
    description: "Heading and intro in the title band at the top of the blog.",
    icon: "📰",
    columns: 2,
  },
  {
    id: "blog.listing",
    title: "Post grid",
    description: "Card links, search message, load-more and empty state.",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "blog.post",
    title: "Post footer",
    description: "The other-posts band and back link at the end of every post.",
    icon: "📖",
    columns: 2,
  },
];

export const gloveBlogSections: TemplateSection[] = [
  {
    id: "blog.header",
    page: "blog",
    title: "Blog heading",
    description: "Title band with the blog title and intro line.",
    groupIds: ["blog.header"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.blog],
  },
  {
    id: "blog.listing",
    page: "blog",
    title: "Post grid",
    description: "Search, post cards, load-more and the empty state.",
    groupIds: ["blog.listing"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.blog],
  },
  // Blog-post context is ONE section by platform convention: the id must be
  // `blog.post` (template-sections.test.ts asserts exactly one per curated
  // template). The root element carries `data-sp-group="blog.post"`.
  {
    id: "blog.post",
    page: "blog",
    renderContext: "blog-post",
    title: "Post footer",
    description: "The other-posts band and back link at the end of every post.",
    groupIds: ["blog.post"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.blog],
  },
];
