import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogPageData: TemplateField[] = [
  {
    key: "modern.blog.listing-tagline",
    label: "Blog listing tagline",
    description: "Tagline shown at the top of the blog index",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue: "Blog",
    placeholder: "e.g. Blog",
  },
  {
    key: "modern.blog.listing-title",
    label: "Blog listing title",
    description: "Heading shown at the top of the blog index",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue: "Latest from the Shop",
    placeholder: "e.g. Latest from the Shop",
  },
  {
    key: "modern.blog.listing-intro",
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

export const modernBlogData = [...blogPageData];

export const modernBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.header",
    title: "Blog listing",
    description: "Heading and intro on the blog index",
    icon: "📝",
    columns: 1,
  },
];
