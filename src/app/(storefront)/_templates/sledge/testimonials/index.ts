import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const testimonialsPageData: TemplateField[] = [
  {
    key: "sledge.testimonials.page-heading",
    label: "Heading",
    description: "Large heading at the top of the testimonials page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Testimonials",
  },
  {
    key: "sledge.testimonials.page-intro",
    label: "Intro text",
    description: "Line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Check out what our customers have been saying about us!",
  },
  {
    key: "sledge.testimonials.empty-state-text",
    label: "Empty state text",
    description: "Text shown when there are no testimonials yet.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "No testimonials yet. Check back soon.",
  },
];

const testimonialsTrendingData: TemplateField[] = [
  {
    key: "sledge.testimonials.trending-heading",
    label: "Heading",
    description: "Heading for the product rail below the testimonials.",
    type: "text",
    page: "testimonials",
    group: "testimonials.trending",
    gridColumn: "col-span-1",
    defaultValue: "Trending Now",
  },
];

export const sledgeTestimonialsData = [
  ...testimonialsPageData,
  ...testimonialsTrendingData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const sledgeTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.page",
    title: "Testimonials page",
    description: "Heading, intro text, and empty state.",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.trending",
    title: "Trending products",
    description: "Product rail shown below the testimonials.",
    icon: "🛍️",
    columns: 1,
  },
];
