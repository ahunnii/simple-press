import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const testimonialsData: TemplateField[] = [
  {
    key: "pollen.testimonials.section-label",
    label: "Small label",
    description: "Short line above the testimonials heading.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Kind Words",
    placeholder: "Kind Words",
  },
  {
    key: "pollen.testimonials.section-heading",
    label: "Heading",
    description: "Main heading at the top of the testimonials page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Testimonials",
    placeholder: "Testimonials",
  },
  {
    key: "pollen.testimonials.call-to-action-header",
    label: "Banner heading",
    description:
      "Heading in the banner below the testimonials, inviting customers to leave their own.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Share your experience",
    placeholder: "Share your experience",
  },
  {
    key: "pollen.testimonials.call-to-action-text",
    label: "Banner text",
    description: "Line below the banner heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Loved shopping with us? We'd love to hear from you.",
    placeholder: "A short invitation to leave feedback...",
  },
  {
    key: "pollen.testimonials.call-to-action-button-text",
    label: "Banner button text",
    description:
      "Label on the banner's button, which links to the testimonial submission form.",
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
    description:
      "Heading and small label at the top of the page, plus the banner inviting customers to leave a testimonial.",
    icon: "⭐",
    columns: 2,
  },
];
