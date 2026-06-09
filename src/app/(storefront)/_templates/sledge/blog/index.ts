import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogListingData: TemplateField[] = [
  {
    key: "sledge.blog-listing-heading",
    label: "Blog Page Heading",
    description: "Heading for the blog listing page",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "Blog",
  },
  {
    key: "sledge.blog-listing-intro",
    label: "Blog Page Intro",
    description: "Optional intro text below the blog heading",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
  },
];

const blogPostData: TemplateField[] = [
  {
    key: "sledge.blog.post-shop-cta-heading",
    label: "Blog Post Shop CTA Heading",
    description:
      "Serif heading in the shop call-to-action band at the bottom of each blog post.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Shop the Collection.",
  },
  {
    key: "sledge.blog.post-shop-cta-subheading",
    label: "Blog Post Shop CTA Subheading",
    description: "Smaller line below the shop CTA heading.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Discover one-of-a-kind wearable art.",
  },
];

export const noiseBlogData = [...blogListingData, ...blogPostData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.listing",
    title: "Blog Page",
    description: "Heading and intro for the blog listing page",
    icon: "✍️",
    columns: 1,
  },
  {
    id: "blog.post",
    title: "Blog Post — Shop CTA",
    description: "Call-to-action band at the bottom of each blog post",
    icon: "🛍️",
    columns: 2,
  },
];
