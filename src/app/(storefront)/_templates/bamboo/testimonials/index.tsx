import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const testimonialsPageData: TemplateField[] = [
  {
    key: "bamboo.testimonials-page.eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Testimonials",
    placeholder: "Testimonials",
  },
  {
    key: "bamboo.testimonials-page.heading",
    label: "Heading",
    description: "Main heading at the top of the testimonials page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "What Customers Say",
  },
  {
    key: "bamboo.testimonials-page.subheading",
    label: "Intro text",
    description: "Line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Real feedback from people who chose bamboo for their home.",
  },
];

export const bambooTestimonialsData = [...testimonialsPageData];

export const bambooTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.page",
    title: "Testimonials page",
    description: "Heading and subheading on the testimonials page.",
    icon: "💬",
    columns: 2,
  },
];
