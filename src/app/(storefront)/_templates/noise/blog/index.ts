import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogListingData: TemplateField[] = [
  {
    key: "noise.blog-listing-heading",
    label: "Heading",
    description: "Heading at the top of the blog page.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "Blog",
  },
  {
    key: "noise.blog-listing-intro",
    label: "Intro text",
    description:
      "Optional text below the heading on the blog page. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
  },
];

const blogPostData: TemplateField[] = [
  {
    key: "noise.blog.post-shop-cta-heading",
    label: "Heading",
    description:
      "Heading shown in the shop banner at the bottom of every blog post.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Shop the Collection.",
  },
  {
    key: "noise.blog.post-shop-cta-subheading",
    label: "Subheading",
    description: "Smaller line below the heading in the shop banner.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Discover pieces made with intention.",
  },
];

export const noiseBlogData = [...blogListingData, ...blogPostData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.listing",
    title: "Blog page",
    description: "Heading and intro text for the blog page.",
    icon: "✍️",
    columns: 1,
  },
  {
    id: "blog.post",
    title: "Blog post shop banner",
    description: "Shop banner shown at the bottom of every blog post.",
    icon: "🛍️",
    columns: 2,
  },
];
