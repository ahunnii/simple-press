import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogListingData: TemplateField[] = [
  {
    key: "noise.blog-listing-heading",
    label: "Blog Page Heading",
    description: "Heading for the blog listing page",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "Blog",
  },
  {
    key: "noise.blog-listing-intro",
    label: "Blog Page Intro",
    description: "Optional intro text below the blog heading",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
  },
];

export const noiseBlogData = [...blogListingData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.listing",
    title: "Blog Page",
    description: "Heading and intro for the blog listing page",
    icon: "✍️",
    columns: 1,
  },
];
