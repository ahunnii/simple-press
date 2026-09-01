import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/// BLOG + TESTIMONIALS PAGES
const blogPageData: TemplateField[] = [
  {
    key: "bamboo.blog.listing-title",
    label: "Blog listing title",
    description: "Main heading in the sage hero band on the blog index page",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "Stories & Insights",
    placeholder: "Stories & Insights",
  },
  {
    key: "bamboo.blog.listing-intro",
    label: "Blog listing intro",
    description: "Short intro below the blog listing title",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue:
      "Notes on tree-free living, caring for your everyday essentials, and what is new from Detroit.",
    placeholder:
      "Notes on tree-free living, caring for your everyday essentials, and what is new from Detroit.",
  },
  {
    key: "bamboo.blog.listing-image",
    label: "Blog listing image",
    description:
      "Optional photo tucked into the blog hero as a tilted photo card. Leave blank to show the illustrated bamboo scene on its own.",
    type: "image",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "bamboo.blog.post-cta-heading",
    label: "Blog post — CTA heading",
    description: "Call-to-action box at the end of each blog post",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-full",
    defaultValue: "Bring bamboo home",
    placeholder: "Bring bamboo home",
  },
  {
    key: "bamboo.blog.post-cta-body",
    label: "Blog post — CTA body",
    description: "Supporting text for the post footer CTA",
    type: "textarea",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-full",
    defaultValue:
      "Explore tree-free, thoughtfully made essentials — crafted for everyday comfort.",
    placeholder:
      "Explore tree-free, thoughtfully made essentials — crafted for everyday comfort.",
  },
  {
    key: "bamboo.blog.post-cta-button-text",
    label: "Blog post — CTA button text",
    description: "Label for the primary button in the post footer CTA",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Shop now",
    placeholder: "Shop now",
  },
  {
    key: "bamboo.blog.post-cta-button-link",
    label: "Blog post — CTA button link",
    description: "Destination URL for the post footer CTA button",
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
    title: "Blog Post Listings Hero",
    description:
      "Blog index sage hero band — title, intro, and an optional photo card",
    icon: "📝",
    columns: 2,
  },
  {
    id: "blog.post",
    title: "Blog Post Call to Action",
    description:
      "Sage call-to-action band at the end of every blog article. Hideable.",
    icon: "✨",
    columns: 2,
  },
];
