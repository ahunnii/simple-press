import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogPageData: TemplateField[] = [
  {
    key: "dark-trend.blog.listing-title",
    label: "Heading",
    description: "Main heading on the blog index page.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "Journal",
    placeholder: "e.g. Stories & Updates",
  },
  {
    key: "dark-trend.blog.listing-intro",
    label: "Intro text",
    description:
      "Line below the heading on the blog index page. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue:
      "News, tips, and updates from our team. Use the search box to find a topic.",
    placeholder: "A short introduction to your blog...",
  },
  {
    key: "dark-trend.blog.listing-more-heading",
    label: "More stories heading",
    description:
      "Heading above the grid of additional posts on the blog index page.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "More stories",
    placeholder: "e.g. Recent posts",
  },
  {
    key: "dark-trend.blog.listing-empty",
    label: "Empty state message",
    description: "Shown on the blog page when there are no posts yet.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "No blog posts yet.",
    placeholder: "e.g. New posts coming soon.",
  },
];

const blogPostData: TemplateField[] = [
  {
    key: "dark-trend.blog.post-more-heading",
    label: "More stories heading",
    description:
      "Heading above related posts at the bottom of every blog post.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "More stories",
    placeholder: "e.g. Keep reading",
  },
];

export const darkTrendBlogData = [...blogPageData, ...blogPostData];

export const darkTrendBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.listing",
    title: "Blog listing",
    description: "Heading and intro for the blog index page.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "blog.post",
    title: "More stories",
    description:
      "Heading above related posts at the bottom of every blog post.",
    icon: "📚",
    columns: 1,
  },
];
