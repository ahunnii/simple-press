import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogPageData: TemplateField[] = [
  {
    key: "modern.blog.listing-tagline",
    label: "Small label",
    description:
      "Short label above the heading at the top of the blog index. Leave blank to hide.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue: "Blog",
    placeholder: "e.g. Blog",
  },
  {
    key: "modern.blog.listing-title",
    label: "Heading",
    description: "Main heading at the top of the blog index.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue: "Latest from the Shop",
    placeholder: "e.g. Latest from the Shop",
  },
  {
    key: "modern.blog.listing-intro",
    label: "Intro text",
    description: "Short paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue:
      "News, tips, and updates from our team. Use the search box to find a topic.",
    placeholder: "A sentence or two about what readers will find here.",
  },
];

export const modernBlogData = [...blogPageData];

export const modernBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.header",
    title: "Intro",
    description: "Small label, heading, and intro above the blog listing.",
    icon: "📝",
    columns: 1,
  },
];
