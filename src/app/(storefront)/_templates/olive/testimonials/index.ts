import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// ─── Hero (+ featured quote / masonry, which are data-driven) ─────────────────

const testimonialsHeroData: TemplateField[] = [
  {
    key: "olive.testimonials.hero-heading",
    label: "Hero Heading",
    description: "The page title.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "Kind words",
  },
  {
    key: "olive.testimonials.hero-body",
    label: "Hero Body",
    description: "One line under the heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "Notes from women who've shopped with us — sizing help, favorite pieces, the whole thing.",
  },
  {
    key: "olive.testimonials.empty-message",
    label: "Empty State Message",
    description: "Shown when there are no approved reviews yet.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Be the first to leave one.",
  },
];

// ─── CTA ──────────────────────────────────────────────────────────────────────

const testimonialsCtaData: TemplateField[] = [
  {
    key: "olive.testimonials.cta-heading",
    label: "CTA Heading",
    description: "Closing heading inviting a new review.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "Loved something you bought?",
  },
  {
    key: "olive.testimonials.cta-body",
    label: "CTA Body",
    description: "One line under the CTA heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue:
      "Tell us about it. Your words help the next woman pick the right piece.",
  },
  {
    key: "olive.testimonials.cta-button-label",
    label: "Button Label",
    description: "Label for the button linking to the submission form.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "Share your experience",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const oliveTestimonialsData: TemplateField[] = [
  ...testimonialsHeroData,
  ...testimonialsCtaData,
];

export const oliveTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.hero",
    title: "Testimonials Hero",
    description:
      "Page heading, intro line and empty-state message. The featured quote and review grid below it are your customers' own approved reviews.",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.cta",
    title: "Submit CTA",
    description: "Closing call-to-action inviting a new review",
    icon: "✍️",
    columns: 1,
  },
];

export const oliveTestimonialsSections: TemplateSection[] = [
  {
    id: "testimonials.hero",
    page: "testimonials",
    title: "Hero & Reviews",
    description: "Page heading, featured quote and the review grid",
    groupIds: ["testimonials.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "testimonials.cta",
    page: "testimonials",
    title: "Submit CTA",
    description: "Closing call-to-action inviting a new review",
    groupIds: ["testimonials.cta"],
    order: 1,
    hideable: true,
  },
];
