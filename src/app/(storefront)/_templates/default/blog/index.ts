import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Copy defaults, exported so the blog pages can fall back to the same string
 * this module declares as `defaultValue` (single source of truth) — needed
 * for the newer fields below while they aren't in the root field map yet,
 * since `resolveFields` can't substitute a `defaultValue` it doesn't know
 * about.
 */
export const BLOG_LISTING_EYEBROW_DEFAULT = "Journal";
export const BLOG_LISTING_SEARCH_EMPTY_DEFAULT = "No posts match your search.";
export const BLOG_LISTING_MORE_LABEL_DEFAULT = "More posts";
export const BLOG_POST_EYEBROW_DEFAULT = "Continue reading";
export const BLOG_POST_MORE_HEADING_DEFAULT = "More articles";

const blogListingData: TemplateField[] = [
  {
    key: "default.blog.listing-title",
    label: "Blog listing title",
    description: "Heading shown at the top of the blog index",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue: "Blog",
    placeholder: "Blog",
  },
  {
    key: "default.blog.listing-intro",
    label: "Blog listing intro",
    description: "Short text below the blog heading",
    type: "textarea",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue:
      "News, tips, and updates from our team. Use the search box to find a topic.",
    placeholder: "Intro paragraph for your blog...",
  },
  {
    key: "default.blog.listing-eyebrow",
    label: "Label above the heading",
    description:
      "Small uppercase text shown above the main heading on the blog index page.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-1",
    defaultValue: BLOG_LISTING_EYEBROW_DEFAULT,
    placeholder: "e.g. Blog",
  },
  {
    key: "default.blog.listing-search-empty",
    label: "No search results message",
    description: "Shown when a search on the blog page matches no posts.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-1",
    defaultValue: BLOG_LISTING_SEARCH_EMPTY_DEFAULT,
    placeholder: "e.g. Try a different search.",
  },
  {
    key: "default.blog.listing-more-label",
    label: "More posts label",
    description:
      "Small label above the post grid, shown below the featured post.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-1",
    defaultValue: BLOG_LISTING_MORE_LABEL_DEFAULT,
    placeholder: "e.g. Recent posts",
  },
];

const blogPostData: TemplateField[] = [
  {
    key: "default.blog.post-eyebrow",
    label: "Label above the related-posts heading",
    description:
      "Small uppercase text shown above the related-posts heading at the bottom of a blog post.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: BLOG_POST_EYEBROW_DEFAULT,
    placeholder: "e.g. Keep reading",
  },
  {
    key: "default.blog.post-more-heading",
    label: "Related-posts heading",
    description:
      "Heading above the related posts at the bottom of a blog post.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: BLOG_POST_MORE_HEADING_DEFAULT,
    placeholder: "e.g. You might also like",
  },
];

export const defaultBlogData: TemplateField[] = [
  ...blogListingData,
  ...blogPostData,
];

export const defaultBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.header",
    title: "Blog listing",
    description: "Heading and intro on the blog index",
    icon: "📝",
    columns: 1,
  },
  {
    id: "blog.post",
    title: "Blog post",
    description: "Related-posts label and heading at the bottom of a post.",
    icon: "📰",
    columns: 2,
  },
];
