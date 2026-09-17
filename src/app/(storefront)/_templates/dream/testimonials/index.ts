import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Testimonials — design.md "Per-page section concepts › Testimonials".
 * Three sections: hero (not hideable), featured (not hideable — has its
 * own designed empty state so it never renders blank), cta (hideable).
 * Approved reviews come from `api.testimonial.list({ publicOnly: true })`,
 * fetched server-side by the page — never hardcoded example reviews.
 */

// ─── Hero — NOT hideable ────────────────────────────────────────────────────

const testimonialsHeroData: TemplateField[] = [
  {
    key: "dream.testimonials.hero-heading",
    label: "Page Heading",
    description: "The page's H1, before the script accent word.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "Kind",
  },
  {
    key: "dream.testimonials.hero-accent",
    label: "Page Heading Accent",
    description: "Script word rendered in rose after the heading.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "words",
  },
  {
    key: "dream.testimonials.hero-lede",
    label: "Page Lede",
    description: "Short line under the page heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "What clients say after Selest turns their occasion into a theme.",
  },
  {
    key: "dream.testimonials.hero-empty-message",
    label: "Empty State Message",
    description:
      "Shown in place of the reviews when there are no approved testimonials yet.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Reviews from recent events are on their way. Had Selest design your celebration?",
  },
];

// ─── Featured review + masonry — NOT hideable (has its own empty state) ───

const testimonialsFeaturedData: TemplateField[] = [
  {
    key: "dream.testimonials.featured-empty-cta-label",
    label: "Empty State Button Label",
    description:
      "Label for the button linking to the story-submission form, shown in the empty state.",
    type: "text",
    page: "testimonials",
    group: "testimonials.featured",
    gridColumn: "col-span-1",
    defaultValue: "Share your story",
  },
];

// ─── Closing CTA — hideable ─────────────────────────────────────────────────

const testimonialsCtaData: TemplateField[] = [
  {
    key: "dream.testimonials.cta-heading",
    label: "CTA Heading",
    description: "Heading for the closing call-to-action band.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue: "Had an event with Selest?",
  },
  {
    key: "dream.testimonials.cta-body",
    label: "CTA Body",
    description: "Short invitation encouraging clients to submit their story.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue: "Tell us how the day turned out — it might be featured here.",
  },
  {
    key: "dream.testimonials.cta-button-label",
    label: "Button Label",
    description: "Label for the button linking to the story-submission form.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-1",
    defaultValue: "Share your story",
  },
];

// ─── Aggregated export ──────────────────────────────────────────────────────

export const dreamTestimonialsData: TemplateField[] = [
  ...testimonialsHeroData,
  ...testimonialsFeaturedData,
  ...testimonialsCtaData,
];

export const dreamTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.hero",
    title: "Page Hero",
    description: "Heading, script accent, lede, and the empty-state message",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "testimonials.featured",
    title: "Featured Review + Grid",
    description:
      "Empty-state button label (the reviews themselves come from approved submissions)",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.cta",
    title: "Share Your Story CTA",
    description:
      "Closing call-to-action inviting clients to submit their story",
    icon: "✍️",
    columns: 2,
  },
];

export const dreamTestimonialsSections: TemplateSection[] = [
  {
    id: "testimonials.hero",
    page: "testimonials",
    title: "Page Hero",
    description: "Logo, heading, lede, and empty-state message",
    groupIds: ["testimonials.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "testimonials.featured",
    page: "testimonials",
    title: "Featured Review + Grid",
    description: "Approved testimonials, or the designed empty state",
    groupIds: ["testimonials.featured"],
    order: 1,
    hideable: false,
  },
  {
    id: "testimonials.cta",
    page: "testimonials",
    title: "Share Your Story CTA",
    description: "Closing call-to-action",
    groupIds: ["testimonials.cta"],
    order: 2,
    hideable: true,
  },
];
