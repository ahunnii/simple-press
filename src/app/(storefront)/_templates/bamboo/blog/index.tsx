import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/// BLOG + TESTIMONIALS PAGES
const blogPageData: TemplateField[] = [
  {
    key: "bamboo.blog.listing-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "Journal",
    placeholder: "Journal",
  },
  {
    key: "bamboo.blog.listing-title",
    label: "Heading",
    description: "Main heading at the top of the blog page.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "Stories & Insights",
    placeholder: "Stories & Insights",
  },
  {
    key: "bamboo.blog.listing-intro",
    label: "Intro text",
    description: "Short intro below the heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue:
      "Tips on sustainable living, product care, and what is new at the shop.",
    placeholder: "Tips on sustainable living and product care.",
  },
  {
    key: "bamboo.blog.listing-image",
    label: "Photo",
    description: "Photo shown beside the heading.",
    type: "image",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.blog.hero-bg-image",
    label: "Background image override",
    description:
      "Overrides the site-wide Page Hero Background for this page only. Blank = use the site-wide image, or the flat band if none is set.",
    type: "image",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "bamboo.blog.post-cta-heading",
    label: "Heading",
    description: "Heading for the closing banner at the end of each post.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-full",
    defaultValue: "Bring bamboo home",
    placeholder: "Bring bamboo home",
  },
  {
    key: "bamboo.blog.post-cta-body",
    label: "Body text",
    description: "Paragraph below the heading.",
    type: "textarea",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-full",
    defaultValue:
      "Explore tree-free, thoughtfully made essentials — crafted for everyday comfort.",
    placeholder: "Explore tree-free, thoughtfully made essentials.",
  },
  {
    key: "bamboo.blog.post-cta-button-text",
    label: "Button text",
    description: "Label for the button.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Shop now",
    placeholder: "Shop now",
  },
  {
    key: "bamboo.blog.post-cta-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /shop",
    type: "url",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

export const bambooBlogData = [...blogPageData];

export const bambooBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.listing",
    title: "Blog page",
    description: "Heading, intro, and photo at the top of the blog index page.",
    icon: "📝",
    columns: 2,
  },
  {
    id: "blog.post",
    title: "End-of-post banner",
    description: "Banner with a heading, short text, and a button at the end of every blog post.",
    icon: "✨",
    columns: 2,
  },
];
