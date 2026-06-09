import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogPageData: TemplateField[] = [
  {
    key: "dark-trend.blog.listing-title",
    label: "Blog Listing Title",
    description: "Main heading on the blog index page",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "Journal",
    placeholder: "e.g. Journal",
  },
  {
    key: "dark-trend.blog.listing-intro",
    label: "Blog Listing Intro",
    description: "Optional subtitle below the blog index heading",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue:
      "News, tips, and updates from our team. Use the search box to find a topic.",
    placeholder: "A short introduction to your blog...",
  },
];

export const darkTrendBlogData = [...blogPageData];

export const darkTrendBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.listing",
    title: "Blog Listing",
    description: "Heading and intro for the blog index page",
    icon: "📝",
    columns: 1,
  },
];
