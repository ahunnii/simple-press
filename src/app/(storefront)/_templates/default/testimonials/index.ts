import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Copy defaults, exported so the testimonials page can fall back to the same
 * string this module declares as `defaultValue` (single source of truth) —
 * needed while these keys aren't in the root field map yet, since
 * `resolveFields` can't substitute a `defaultValue` it doesn't know about.
 */
export const TESTIMONIALS_LISTING_LABEL_DEFAULT = "From customers";
export const TESTIMONIALS_LISTING_HEADING_DEFAULT = "What people say.";
export const TESTIMONIALS_LISTING_INTRO_DEFAULT =
  "Real reviews from real orders.";
export const TESTIMONIALS_LISTING_EMPTY_DEFAULT =
  "No reviews yet — check back soon!";
export const TESTIMONIALS_SHARE_LABEL_DEFAULT = "Recent purchase?";
export const TESTIMONIALS_SHARE_HEADING_DEFAULT = "Tell us how it went.";
export const TESTIMONIALS_SHARE_BODY_DEFAULT =
  "Reviews help other shoppers find what they need — and tell us what to make more of.";
export const TESTIMONIALS_SHARE_BUTTON_DEFAULT = "Write a review";

const testimonialsListingData: TemplateField[] = [
  {
    key: "default.testimonials.listing-label",
    label: "Label above the heading",
    description:
      "Small uppercase text shown above the main heading on the testimonials page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.listing",
    gridColumn: "col-span-1",
    defaultValue: TESTIMONIALS_LISTING_LABEL_DEFAULT,
    placeholder: "e.g. Reviews",
  },
  {
    key: "default.testimonials.listing-heading",
    label: "Heading",
    description: "Main heading on the testimonials page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.listing",
    gridColumn: "col-span-1",
    defaultValue: TESTIMONIALS_LISTING_HEADING_DEFAULT,
    placeholder: "e.g. Loved by our customers.",
  },
  {
    key: "default.testimonials.listing-intro",
    label: "Intro text",
    description: "Line below the heading on the testimonials page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.listing",
    gridColumn: "col-span-full",
    defaultValue: TESTIMONIALS_LISTING_INTRO_DEFAULT,
    placeholder: "e.g. Feedback from verified buyers.",
  },
  {
    key: "default.testimonials.listing-empty",
    label: "Empty state message",
    description:
      "Shown on the testimonials page when there are no reviews yet.",
    type: "text",
    page: "testimonials",
    group: "testimonials.listing",
    gridColumn: "col-span-full",
    defaultValue: TESTIMONIALS_LISTING_EMPTY_DEFAULT,
    placeholder: "e.g. Reviews are coming soon.",
  },
];

const testimonialsShareData: TemplateField[] = [
  {
    key: "default.testimonials.share-label",
    label: "Label above the heading",
    description:
      "Small uppercase text shown above the heading in the submit-a-review banner.",
    type: "text",
    page: "testimonials",
    group: "testimonials.share",
    gridColumn: "col-span-1",
    defaultValue: TESTIMONIALS_SHARE_LABEL_DEFAULT,
    placeholder: "e.g. Just bought something?",
  },
  {
    key: "default.testimonials.share-heading",
    label: "Heading",
    description: "Heading in the submit-a-review banner.",
    type: "text",
    page: "testimonials",
    group: "testimonials.share",
    gridColumn: "col-span-1",
    defaultValue: TESTIMONIALS_SHARE_HEADING_DEFAULT,
    placeholder: "e.g. Share your experience.",
  },
  {
    key: "default.testimonials.share-body",
    label: "Body text",
    description:
      "Line below the heading in the submit-a-review banner. Leave blank to hide.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.share",
    gridColumn: "col-span-full",
    defaultValue: TESTIMONIALS_SHARE_BODY_DEFAULT,
    placeholder: "One or two sentences inviting customers to leave a review.",
  },
  {
    key: "default.testimonials.share-button",
    label: "Write a review button",
    description:
      "Label on the button that links to the review submission form. Leave blank to hide.",
    type: "text",
    page: "testimonials",
    group: "testimonials.share",
    gridColumn: "col-span-1",
    defaultValue: TESTIMONIALS_SHARE_BUTTON_DEFAULT,
    placeholder: "e.g. Leave a review",
  },
];

export const defaultTestimonialsData: TemplateField[] = [
  ...testimonialsListingData,
  ...testimonialsShareData,
];

export const defaultTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.listing",
    title: "Testimonials",
    description:
      "Label, heading, intro, and empty state on the testimonials page.",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.share",
    title: "Share your experience",
    description: "Banner inviting customers to submit a review.",
    icon: "✍️",
    columns: 2,
  },
];
