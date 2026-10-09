import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

// Testimonials page (extrapolated). The notes themselves come from
// Admin → Testimonials; only headings and microcopy live here.

const testimonialsTitleData: TemplateField[] = [
  {
    key: "glove.testimonials.title",
    label: "Page title",
    description: "Large title at the top of the page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.title",
    gridColumn: "col-span-1",
    defaultValue: "Love Notes",
  },
  {
    key: "glove.testimonials.subtitle",
    label: "Subtitle",
    description: "Line under the title. Leave blank to hide.",
    type: "text",
    page: "testimonials",
    group: "testimonials.title",
    gridColumn: "col-span-1",
    defaultValue: "What our customers say",
  },
];

const testimonialsListData: TemplateField[] = [
  {
    key: "glove.testimonials.empty-heading",
    label: "Empty state heading",
    description: "Shown when there are no approved testimonials yet.",
    type: "text",
    page: "testimonials",
    group: "testimonials.list",
    gridColumn: "col-span-full",
    defaultValue: "No love notes yet",
  },
  {
    key: "glove.testimonials.empty-body",
    label: "Empty state text",
    description: "Line under the empty state heading. Leave blank to hide.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.list",
    gridColumn: "col-span-full",
    defaultValue:
      "Once customers share their stories about their gloves, they will gather here.",
  },
];

const testimonialsSubmitData: TemplateField[] = [
  {
    key: "glove.testimonials.submit-heading",
    label: "Heading",
    description: "Heading of the closing invitation to share a testimonial.",
    type: "text",
    page: "testimonials",
    group: "testimonials.submit",
    gridColumn: "col-span-full",
    defaultValue: "Share Your Own Love Note",
  },
  {
    key: "glove.testimonials.submit-body",
    label: "Text",
    description: "Line under the heading. Leave blank to hide.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.submit",
    gridColumn: "col-span-full",
    defaultValue:
      "Wearing your LuvGluv already? We would love to hear what it means to you.",
  },
  {
    key: "glove.testimonials.submit-label",
    label: "Button label",
    description:
      "Label of the button that opens the testimonial form. Leave blank to hide the button.",
    type: "text",
    page: "testimonials",
    group: "testimonials.submit",
    gridColumn: "col-span-full",
    defaultValue: "Write a Testimonial",
  },
];

export const gloveTestimonialsData: TemplateField[] = [
  ...testimonialsTitleData,
  ...testimonialsListData,
  ...testimonialsSubmitData,
];

export const gloveTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.title",
    title: "Page title",
    description: "Title and subtitle at the top of the page",
    icon: "💌",
    columns: 2,
  },
  {
    id: "testimonials.list",
    title: "Testimonials",
    description:
      "Wording shown when there are no testimonials yet (the testimonials themselves are managed in the admin)",
    icon: "💬",
    columns: 1,
  },
  {
    id: "testimonials.submit",
    title: "Share your own",
    description: "Closing invitation that links to the testimonial form",
    icon: "✍️",
    columns: 1,
  },
];

export const gloveTestimonialsSections: TemplateSection[] = [
  {
    id: "testimonials.title",
    page: "testimonials",
    title: "Page title",
    description: "Title band at the top of the page.",
    groupIds: ["testimonials.title"],
    order: 0,
    hideable: false,
  },
  {
    id: "testimonials.list",
    page: "testimonials",
    title: "Testimonials",
    description: "Masonry grid of approved testimonials.",
    groupIds: ["testimonials.list"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.testimonials],
  },
  {
    id: "testimonials.submit",
    page: "testimonials",
    title: "Share your own",
    description: "Closing invitation that links to the testimonial form.",
    groupIds: ["testimonials.submit"],
    order: 2,
    hideable: true,
  },
];
