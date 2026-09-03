import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const testimonialsPageData: TemplateField[] = [
  {
    key: "animated-bamboo.testimonials-page.heading",
    label: "Testimonials page heading",
    description: "Main heading on the /testimonials page",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "What Customers Say",
  },
  {
    key: "animated-bamboo.testimonials-page.subheading",
    label: "Testimonials page subheading",
    description: "Supporting line under the heading",
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
    description: "Heading and subheading for the testimonials page",
    icon: "💬",
    columns: 2,
  },
];
