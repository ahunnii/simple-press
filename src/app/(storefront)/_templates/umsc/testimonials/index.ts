import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// design.md "Per-page section concepts › Testimonials": hero (not hideable)
// → featured pull-quote + masonry (not hideable, DB-driven — real
// testimonials only) → closing CTA band (hideable). Empty state = hero +
// band, with a short designed message in between (craft floor: every list
// has a designed empty state).

// ─── Hero (testimonials.hero) ──────────────────────────────────────────────

const testimonialsHeroData: TemplateField[] = [
  {
    key: "umsc.testimonials.hero-heading",
    label: "Hero Heading",
    description: "The page title shown on the black page-hero band.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Our customers. Our community.",
  },
  {
    key: "umsc.testimonials.hero-lede",
    label: "Hero Lede",
    description: "One sentence beneath the heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Real words from real customers, in their own words.",
  },
  {
    key: "umsc.testimonials.empty-message",
    label: "Empty State Message",
    description: "Shown when there are no customer reviews yet.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Be the first to share your experience.",
  },
];

// ─── Featured review (testimonials.featured) ───────────────────────────────

const testimonialsFeaturedData: TemplateField[] = [
  {
    key: "umsc.testimonials.review-source-label",
    label: "Review Source Label",
    description:
      "Caption shown under each customer's name on the featured quote and every review card (e.g. 'Verified customer').",
    type: "text",
    page: "testimonials",
    group: "testimonials.featured",
    gridColumn: "col-span-full",
    defaultValue: "Verified customer",
  },
];

// ─── CTA (testimonials.cta, hideable) ──────────────────────────────────────

const testimonialsCtaData: TemplateField[] = [
  {
    key: "umsc.testimonials.cta-heading",
    label: "CTA Heading",
    description: "Heading on the closing cream band.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue: "Had an order from us?",
  },
  {
    key: "umsc.testimonials.cta-body",
    label: "CTA Body Text",
    description:
      "Short invitation encouraging customers to share their experience.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "We'd love to hear about it — your words help other customers feel confident shopping small.",
  },
  {
    key: "umsc.testimonials.cta-button-label",
    label: "Button Text",
    description: "Text for the 'submit a testimonial' button.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "Share your experience",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const umscTestimonialsData: TemplateField[] = [
  ...testimonialsHeroData,
  ...testimonialsFeaturedData,
  ...testimonialsCtaData,
];

export const umscTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.hero",
    title: "Testimonials Hero",
    description: "Page-hero heading, lede, and the empty-state message",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.featured",
    title: "Featured Review",
    description:
      "Caption shown on the featured pull-quote and every review card",
    icon: "⭐",
    columns: 1,
  },
  {
    id: "testimonials.cta",
    title: "Testimonials CTA",
    description: "Closing band encouraging customers to submit a review",
    icon: "✍️",
    columns: 2,
  },
];

export const umscTestimonialsSections: TemplateSection[] = [
  {
    id: "testimonials.hero",
    page: "testimonials",
    title: "Hero",
    description: "Page hero with heading and lede",
    groupIds: ["testimonials.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "testimonials.featured",
    page: "testimonials",
    title: "Featured Review",
    description: "The first review as a pull-quote, then a masonry of the rest",
    groupIds: ["testimonials.featured"],
    order: 1,
    hideable: false,
  },
  {
    id: "testimonials.cta",
    page: "testimonials",
    title: "Closing CTA",
    description: "Closing band with the Google-review link and a submit button",
    groupIds: ["testimonials.cta"],
    order: 2,
    hideable: true,
  },
];
