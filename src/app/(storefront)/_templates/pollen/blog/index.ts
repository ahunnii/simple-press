import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogPageData: TemplateField[] = [
  {
    key: "pollen.blog.listing-title",
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
    key: "pollen.blog.listing-intro",
    label: "Blog listing intro",
    description: "Short text below the blog hero (optional)",
    type: "textarea",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue:
      "News, tips, and updates from our team. Use the search box to find a topic.",
    placeholder: "Intro paragraph for your blog...",
  },
  {
    key: "pollen.blog.listing-hero-image",
    label: "Blog listing hero image",
    description:
      "Optional background image for the blog index hero. If empty, the site header background or default image is used.",
    type: "image",
    page: "blog",
    group: "blog.header",
    defaultValue: "/placeholder.svg",
    gridColumn: "col-span-full",
  },
];

export const pollenBlogData = [...blogPageData];

export const pollenBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.header",
    title: "Blog",
    description: "Heading, intro, and optional hero image on the blog index",
    icon: "📝",
    columns: 1,
  },
];
