import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { umscHeroPhotoFields } from "../shared/umsc-hero-fields";

// design.md "Per-page section concepts › Testimonials": hero (not hideable)
// → featured pull-quote + masonry (not hideable, DB-driven — real
// testimonials only) → closing CTA band (hideable). Empty state = hero +
// band, with a short designed message in between (craft floor: every list
// has a designed empty state).

// ─── Hero (testimonials.hero) ──────────────────────────────────────────────

const testimonialsHeroData: TemplateField[] = [
  {
    key: "umsc.testimonials.hero-heading",
    label: "Heading",
    description: "The page's main heading, at the top of the page.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Our customers. Our community.",
  },
  {
    key: "umsc.testimonials.hero-lede",
    label: "Subheading",
    description: "One sentence beneath the heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Real words from real customers, in their own words.",
  },
  ...umscHeroPhotoFields("testimonials", "testimonials.hero"),
  {
    key: "umsc.testimonials.empty-message",
    label: "Empty state message",
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
    label: "Review source label",
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
    label: "Closing heading",
    description: "Heading on the closing band.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue: "Had an order from us?",
  },
  {
    key: "umsc.testimonials.cta-body",
    label: "Closing text",
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
    label: "Button text",
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
    title: "Hero",
    description:
      "Page heading, subheading, optional photo, and the empty-state message",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.featured",
    title: "Featured review",
    description:
      "Caption shown on the featured pull-quote and every review card",
    icon: "⭐",
    columns: 1,
  },
  {
    id: "testimonials.cta",
    title: "Closing banner",
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
    description: "Page heading, subheading, and an optional photo",
    groupIds: ["testimonials.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "testimonials.featured",
    page: "testimonials",
    title: "Featured review",
    description: "The first review as a pull-quote, then a masonry of the rest",
    groupIds: ["testimonials.featured"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.testimonials],
  },
  {
    id: "testimonials.cta",
    page: "testimonials",
    title: "Closing banner",
    description: "Closing band with the Google-review link and a submit button",
    groupIds: ["testimonials.cta"],
    order: 2,
    hideable: true,
  },
];
