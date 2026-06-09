import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

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
];

export const defaultBlogData: TemplateField[] = [...blogListingData];

export const defaultBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.header",
    title: "Blog listing",
    description: "Heading and intro on the blog index",
    icon: "📝",
    columns: 1,
  },
];
