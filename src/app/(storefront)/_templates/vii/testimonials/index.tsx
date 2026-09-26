import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const testimonialsHeroData: TemplateField[] = [
  {
    key: "vii.testimonials.overline",
    label: "Small label",
    description: "Small label shown above the page title.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "Kind Words",
  },
  {
    key: "vii.testimonials.heading",
    label: "Heading",
    description:
      "The plain part of the page heading (e.g. 'What our').",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "What our",
  },
  {
    key: "vii.testimonials.heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "clients say",
  },
  {
    key: "vii.testimonials.intro",
    label: "Intro text",
    description:
      "Short paragraph below the heading introducing this page.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Every visit matters to us. Read what our clients have experienced and shared — in their own words.",
  },
  {
    key: "vii.testimonials.empty-message",
    label: "Empty state message",
    description:
      "Text shown when there are no testimonials yet.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Be the first to share your experience.",
  },
];

// ─── Review invite ────────────────────────────────────────────────────────────

const testimonialsCTAData: TemplateField[] = [
  {
    key: "vii.testimonials.cta-heading",
    label: "Heading",
    description:
      "The plain part of the heading (e.g. 'Tried something you').",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "Tried something you",
  },
  {
    key: "vii.testimonials.cta-heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "loved?",
  },
  {
    key: "vii.testimonials.cta-body",
    label: "Body text",
    description: "Short invitation encouraging clients to leave a review.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Your words help other clients feel confident choosing Skinbar VII. We'd love to hear about your experience.",
  },
  {
    key: "vii.testimonials.cta-button",
    label: "Button text",
    description: "Text for the button that lets clients submit a testimonial.",
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
    title: "Page header",
    description:
      "Small label, heading, intro paragraph, and empty-state message for the testimonials page",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.cta",
    title: "Review invite",
    description:
      "Section at the bottom of the testimonials page encouraging clients to submit a review",
    icon: "✍️",
    columns: 2,
  },
];
