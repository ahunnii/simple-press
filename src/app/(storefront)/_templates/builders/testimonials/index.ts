import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Testimonials Page ────────────────────────────────────────────────────────

export const buildersTestimonialsData: TemplateField[] = [
  {
    key: "builders.testimonials.page-heading",
    label: "Page Heading",
    description: "Large display headline for the testimonials page",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Community Voice",
    placeholder: "Community Voice",
  },
  {
    key: "builders.testimonials.page-intro",
    label: "Page Intro",
    description:
      "Introductory paragraph below the page heading (left-bordered accent)",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue:
      "The stark reality of restoration in Detroit, as told by those who live within the structures we reclaim. Brutal honesty. Enduring structures.",
    placeholder: "Short intro about your testimonials page…",
  },
  {
    key: "builders.testimonials.empty-state-text",
    label: "Empty State Text",
    description:
      "Text shown when no testimonials have been published yet",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue:
      "No testimonials yet. Be the first to share your experience working with our cooperative.",
    placeholder: "Message shown when no testimonials exist…",
  },
  {
    key: "builders.testimonials.cta-heading",
    label: "CTA Heading",
    description: "Heading for the submit-a-testimonial call-to-action band",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Worked With Us?",
    placeholder: "Worked With Us?",
  },
  {
    key: "builders.testimonials.cta-body",
    label: "CTA Body",
    description:
      "Supporting copy below the CTA heading encouraging visitors to share their story",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue:
      "Share your experience and help others find a cooperative that builds with integrity.",
    placeholder: "Encourage visitors to share their experience…",
  },
  {
    key: "builders.testimonials.cta-button-label",
    label: "CTA Button Label",
    description: "Label on the submit-a-story button",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Share Your Story",
    placeholder: "Share Your Story",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const buildersTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.page",
    title: "Testimonials Page",
    description:
      "Heading, intro, empty state, and the submit call-to-action.",
    icon: "💬",
    columns: 1,
  },
];
