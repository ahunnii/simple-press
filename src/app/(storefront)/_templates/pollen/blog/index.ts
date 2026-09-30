import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const blogPageData: TemplateField[] = [
  {
    key: "pollen.blog.listing-title",
    label: "Heading",
    description: "Heading shown at the top of the blog page.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue: "Blog",
    placeholder: "Blog",
  },
  {
    key: "pollen.blog.listing-intro",
    label: "Intro text",
    description: "Short line below the blog heading. Leave blank to hide.",
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
    label: "Background image",
    description:
      "Background image behind the blog heading. Leave blank to use the page hero background set under Global → Site header.",
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
    description: "Heading, intro text, and background image at the top of the blog page.",
    icon: "📝",
    columns: 1,
  },
];
