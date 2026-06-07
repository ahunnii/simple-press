import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const testimonialsPageData: TemplateField[] = [
  {
    key: "sledge.testimonials.page-heading",
    label: "Page Heading",
    description: "Large heading at the top of the testimonials page",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Testimonials",
  },
  {
    key: "sledge.testimonials.page-intro",
    label: "Page Intro",
    description: "Short line shown below the page heading",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Check out what our customers have been saying about us!",
  },
  {
    key: "sledge.testimonials.trending-heading",
    label: "Trending Section Heading",
    description: "Heading for the product rail below the testimonials",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Trending Now",
  },
  {
    key: "sledge.testimonials.empty-state-text",
    label: "Empty State Text",
    description: "Text shown when there are no testimonials yet",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "No testimonials yet. Check back soon.",
  },
];

export const sledgeTestimonialsData = [...testimonialsPageData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const sledgeTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.page",
    title: "Testimonials Page",
    description: "Heading, intro, trending section, and empty state",
    icon: "💬",
    columns: 2,
  },
];
