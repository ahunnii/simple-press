import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const testimonialsListingData: TemplateField[] = [
  {
    key: "dark-trend.testimonials.listing-heading",
    label: "Heading",
    description: "Main heading at the top of the testimonials page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.listing",
    gridColumn: "col-span-1",
    defaultValue: "Testimonials",
    placeholder: "e.g. Reviews",
  },
  {
    key: "dark-trend.testimonials.listing-intro",
    label: "Intro text",
    description: "Line below the heading.",
    type: "text",
    page: "testimonials",
    group: "testimonials.listing",
    gridColumn: "col-span-1",
    defaultValue: "What our customers say",
    placeholder: "e.g. Real feedback, real results",
  },
  {
    key: "dark-trend.testimonials.listing-empty",
    label: "Empty state message",
    description: "Shown when there are no testimonials yet.",
    type: "text",
    page: "testimonials",
    group: "testimonials.listing",
    gridColumn: "col-span-full",
    defaultValue: "No testimonials yet. Check back soon!",
    placeholder: "e.g. Reviews are coming soon.",
  },
  {
    key: "dark-trend.testimonials.listing-back-label",
    label: "Back-to-home link text",
    description: "Link shown under the empty state, back to the homepage.",
    type: "text",
    page: "testimonials",
    group: "testimonials.listing",
    gridColumn: "col-span-1",
    defaultValue: "Back to home",
    placeholder: "e.g. Return home",
  },
];

const testimonialsShareData: TemplateField[] = [
  {
    key: "dark-trend.testimonials.share-heading",
    label: "Heading",
    description:
      "Heading in the banner inviting customers to leave a testimonial.",
    type: "text",
    page: "testimonials",
    group: "testimonials.share",
    gridColumn: "col-span-1",
    defaultValue: "Share Your Experience",
    placeholder: "e.g. Tell us how it went",
  },
  {
    key: "dark-trend.testimonials.share-body",
    label: "Body text",
    description: "Line under the heading. Leave blank to hide.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.share",
    gridColumn: "col-span-full",
    defaultValue: "Loved shopping with us? We'd love to hear from you.",
    placeholder: "e.g. Tell other shoppers about your experience.",
  },
  {
    key: "dark-trend.testimonials.share-button",
    label: "Button text",
    description:
      "Label on the button that links to the testimonial submission form. Leave blank to hide.",
    type: "text",
    page: "testimonials",
    group: "testimonials.share",
    gridColumn: "col-span-1",
    defaultValue: "Write a Testimonial",
    placeholder: "e.g. Leave a review",
  },
];

export const darkTrendTestimonialsData: TemplateField[] = [
  ...testimonialsListingData,
  ...testimonialsShareData,
];

export const darkTrendTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.listing",
    title: "Testimonials",
    description:
      "Heading, intro, empty state, and back-to-home link on the testimonials page.",
    icon: "💬",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "testimonials.share",
    title: "Share your experience",
    description: "Banner inviting customers to submit a testimonial.",
    icon: "✍️",
    columns: 2,
  } satisfies TemplateFieldGroup,
];
