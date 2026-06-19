import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const testimonialsHeroData: TemplateField[] = [
  {
    key: "vii.testimonials.overline",
    label: "Hero Overline",
    description: "Small uppercase label shown above the page title.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "Kind Words",
  },
  {
    key: "vii.testimonials.heading",
    label: "Hero Heading",
    description:
      "The plain part of the two-part page heading (e.g. 'What our').",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "What our",
  },
  {
    key: "vii.testimonials.heading-accent",
    label: "Hero Heading Accent",
    description:
      "The italic copper accent word completing the heading (e.g. 'clients say').",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "clients say",
  },
  {
    key: "vii.testimonials.intro",
    label: "Hero Intro Text",
    description:
      "Short paragraph below the heading introducing the testimonials section.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Every visit matters to us. Read what our clients have experienced and shared — in their own words.",
  },
  {
    key: "vii.testimonials.empty-message",
    label: "Empty State Message",
    description:
      "Text shown when there are no testimonials yet. Leave as-is or personalise.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Be the first to share your experience.",
  },
];

// ─── CTA ──────────────────────────────────────────────────────────────────────

const testimonialsCTAData: TemplateField[] = [
  {
    key: "vii.testimonials.cta-heading",
    label: "CTA Heading",
    description:
      "The plain part of the two-part CTA heading (e.g. 'Tried something you').",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "Tried something you",
  },
  {
    key: "vii.testimonials.cta-heading-accent",
    label: "CTA Heading Accent",
    description:
      "The italic copper accent word completing the CTA heading (e.g. 'loved?').",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "loved?",
  },
  {
    key: "vii.testimonials.cta-body",
    label: "CTA Body Text",
    description:
      "Short invitation encouraging clients to leave a review.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Your words help other clients feel confident choosing Skinbar VII. We'd love to hear about your experience.",
  },
  {
    key: "vii.testimonials.cta-button",
    label: "CTA Button Label",
    description: "Text for the submit-a-testimonial button.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "Share your experience",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const viiTestimonialsData: TemplateField[] = [
  ...testimonialsHeroData,
  ...testimonialsCTAData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const viiTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.hero",
    title: "Testimonials Hero",
    description:
      "Overline, heading, intro paragraph, and empty-state message for the testimonials page",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.cta",
    title: "Testimonials CTA",
    description:
      "Call-to-action band at the bottom of the testimonials page encouraging clients to submit a review",
    icon: "✍️",
    columns: 2,
  },
];
