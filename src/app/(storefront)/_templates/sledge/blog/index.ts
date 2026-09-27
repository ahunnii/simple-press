import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogListingData: TemplateField[] = [
  {
    key: "sledge.blog-listing-heading",
    label: "Heading",
    description: "Heading at the top of the blog page.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "Blog",
  },
  {
    key: "sledge.blog-listing-intro",
    label: "Intro text",
    description: "Line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
  },
];

const blogPostData: TemplateField[] = [
  {
    key: "sledge.blog.post-shop-cta-heading",
    label: "Heading",
    description:
      "Heading in the shop banner shown at the bottom of every blog post.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Shop the Collection.",
  },
];

export const sledgeBlogData = [...blogListingData, ...blogPostData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const sledgeBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.listing",
    title: "Blog page",
    description: "Heading and intro for the blog page.",
    icon: "✍️",
    columns: 1,
  },
  {
    id: "blog.post",
    title: "Shop banner",
    description: "Banner shown at the bottom of each blog post.",
    icon: "🛍️",
    columns: 2,
  },
];
