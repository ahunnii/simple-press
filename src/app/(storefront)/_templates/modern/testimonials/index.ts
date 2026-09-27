import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const testimonialsData: TemplateField[] = [
  {
    key: "modern.testimonials.tagline",
    label: "Small label",
    description:
      "Short label above the heading at the top of the Testimonials page. Leave blank to hide.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Kind Words",
    placeholder: "e.g. Kind Words",
  },
  {
    key: "modern.testimonials.header",
    label: "Heading",
    description: "Main heading at the top of the Testimonials page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Testimonials",
    placeholder: "e.g. Testimonials",
  },
  {
    key: "modern.testimonials.description",
    label: "Intro text",
    description: "Short paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "What our customers have to say",
    placeholder: "A short line introducing the testimonials below.",
  },
];

const testimonialsCallToActionData: TemplateField[] = [
  {
    key: "modern.testimonials.call-to-action.header",
    label: "Heading",
    description:
      "Heading on the band inviting customers to leave a testimonial.",
    type: "text",
    page: "testimonials",
    group: "testimonials.call-to-action",
    gridColumn: "col-span-full",
    defaultValue: "Share your experience",
    placeholder: "e.g. Share your experience",
  },
  {
    key: "modern.testimonials.call-to-action.text",
    label: "Intro text",
    description: "Short text on the band, below the heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.call-to-action",
    gridColumn: "col-span-full",
    defaultValue: "Loved shopping with us? We'd love to hear from you.",
    placeholder: "A line inviting happy customers to share feedback.",
  },
  {
    key: "modern.testimonials.call-to-action.button-text",
    label: "Button text",
    description: "Label on the button linking to the testimonial form.",
    type: "text",
    page: "testimonials",
    group: "testimonials.call-to-action",
    gridColumn: "col-span-full",
    defaultValue: "Write a testimonial",
    placeholder: "e.g. Write a testimonial",
  },
  {
    key: "modern.testimonials.call-to-action.button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /testimonials/submit.",
    type: "url",
    page: "testimonials",
    group: "testimonials.call-to-action",
    gridColumn: "col-span-full",
    defaultValue: "/testimonials/submit",
    placeholder: "/testimonials/submit",
  },
];

export const modernTestimonialsData = [
  ...testimonialsData,
  ...testimonialsCallToActionData,
];

export const modernTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.page",
    title: "Intro",
    description: "Small label, heading, and intro above the testimonial cards.",
    icon: "⭐",
    columns: 2,
  },
  {
    id: "testimonials.call-to-action",
    title: "Share your experience",
    description: "Band inviting customers to leave a testimonial.",
    icon: "💬",
    columns: 2,
  },
];
