import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const testimonialsData: TemplateField[] = [
  {
    key: "pollen.testimonials.section-label",
    label: "Section Label",
    description: "Small label shown above the testimonials heading",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Kind Words",
    placeholder: "Kind Words",
  },
  {
    key: "pollen.testimonials.section-heading",
    label: "Section Heading",
    description: "Main heading for the testimonials block",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Testimonials",
    placeholder: "Testimonials",
  },
  {
    key: "pollen.testimonials.call-to-action-header",
    label: "Call to Action Header",
    description: "Header for the call to action section",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Share your experience",
    placeholder: "Share your experience",
  },
  {
    key: "pollen.testimonials.call-to-action-text",
    label: "Call to Action Text",
    description: "Text for the call to action section",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Loved shopping with us? We'd love to hear from you.",
    placeholder: "Loved shopping with us? We'd love to hear from you.",
  },
  {
    key: "pollen.testimonials.call-to-action-button-text",
    label: "Call to Action Button Text",
    description: "Text for the call to action button",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Write a Testimonial",
    placeholder: "Write a Testimonial",
  },
];

export const pollenTestimonialsData = [...testimonialsData];

export const pollenTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.page",
    title: "Testimonials page",
    description: "Heading and subheading for the testimonials page",
    icon: "�",
    columns: 2,
  },
];
