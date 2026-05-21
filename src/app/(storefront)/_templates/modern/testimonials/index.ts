import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const testimonialsData: TemplateField[] = [
  {
    key: "modern.testimonials.tagline",
    label: "Tagline",
    description: "Tagline for the testimonials section",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Kind Words",
    placeholder: "e.g. Kind Words",
  },
  {
    key: "modern.testimonials.header",
    label: "Header",
    description: "Header for the testimonials section",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Testimonials",
    placeholder: "e.g. Testimonials",
  },
  {
    key: "modern.testimonials.description",
    label: "Description",
    description: "Description for the testimonials section",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "What our customers have to say",
    placeholder: "e.g. What our customers have to say",
  },
];

const testimonialsCallToActionData: TemplateField[] = [
  {
    key: "modern.testimonials.call-to-action.header",
    label: "Header",
    description: "Header for the call to action section",
    type: "text",
    page: "testimonials",
    group: "testimonials.call-to-action",
    gridColumn: "col-span-full",
    defaultValue: "Share your experience",
    placeholder: "e.g. Share your experience",
  },
  {
    key: "modern.testimonials.call-to-action.text",
    label: "Text",
    description: "Text for the call to action section",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.call-to-action",
    gridColumn: "col-span-full",
    defaultValue: "Loved shopping with us? We'd love to hear from you.",
    placeholder: "e.g. Loved shopping with us? We'd love to hear from you.",
  },
  {
    key: "modern.testimonials.call-to-action.button-text",
    label: "Button Text",
    description: "Text for the call to action button",
    type: "text",
    page: "testimonials",
    group: "testimonials.call-to-action",
    gridColumn: "col-span-full",
    defaultValue: "Write a testimonial",
    placeholder: "e.g. Write a testimonial",
  },
];

export const modernTestimonialsData = [
  ...testimonialsData,
  ...testimonialsCallToActionData,
];

export const modernTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.page",
    title: "Testimonials Page",
    description: "Heading and subheading for the testimonials page",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.call-to-action",
    title: "Call to Action",
    description: "Call to action for the testimonials page",
    icon: "💬",
    columns: 2,
  },
];
