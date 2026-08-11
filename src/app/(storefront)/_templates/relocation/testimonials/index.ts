import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Reviews (`/testimonials`) field module for `relocation` (Handy
 * Relocations). Covers design.md → "Per-page section concepts → Reviews":
 * wave hero + the right-aligned "Our Client Testimonials!" carousel. Rows
 * themselves are DB `Testimonial` records (Content → Testimonials in admin),
 * not template fields — this module only owns the heading and the designed
 * empty state. The credentials band that closes the page is global
 * (`global.credentials`, see `../layout/index.ts`) and renders its FULL
 * heading here (no homepage-style override).
 */

// ─── testimonials.hero ───────────────────────────────────────────────────────

const testimonialsHeroData: TemplateField[] = [
  {
    key: "relocation.testimonials.hero-heading",
    label: "Hero Heading",
    description: "The big white headline on the terracotta wave hero.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "Reviews",
  },
  {
    key: "relocation.testimonials.hero-subheading",
    label: "Hero Paragraph",
    description: "Short line under the hero headline. Leave blank to hide it.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Hear what our customers have to say about us!",
  },
  {
    key: "relocation.testimonials.hero-cta-label",
    label: "Hero Button Label",
    description:
      "Outlined button on the hero. It dials the same number as the header call button. Leave blank to hide the button.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "CALL US TODAY",
  },
];

// ─── testimonials.list ───────────────────────────────────────────────────────

const testimonialsListData: TemplateField[] = [
  {
    key: "relocation.testimonials.list-heading",
    label: "Reviews Heading",
    description:
      "The right-aligned heading above the review carousel. The reviews themselves come from Content → Testimonials.",
    type: "text",
    page: "testimonials",
    group: "testimonials.list",
    gridColumn: "col-span-full",
    defaultValue: "Our Client Testimonials!",
  },
  {
    key: "relocation.testimonials.empty-heading",
    label: "No-Reviews Heading",
    description:
      "Shown in place of the carousel until you have an approved review.",
    type: "text",
    page: "testimonials",
    group: "testimonials.list",
    gridColumn: "col-span-1",
    defaultValue: "No Reviews Yet",
  },
  {
    key: "relocation.testimonials.empty-body",
    label: "No-Reviews Message",
    description: "The reassurance line under the no-reviews heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.list",
    gridColumn: "col-span-full",
    defaultValue:
      "Be our next happy move! Give us a call and we’ll make sure your move is a five-star story worth sharing.",
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

export const relocationTestimonialsData: TemplateField[] = [
  ...testimonialsHeroData,
  ...testimonialsListData,
];

export const relocationTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.hero",
    title: "Hero",
    description: "Terracotta wave hero: headline, paragraph and call button",
    icon: "🌊",
    columns: 2,
  },
  {
    id: "testimonials.list",
    title: "Client Testimonials",
    description:
      "Heading for the review carousel plus the message shown before your first approved review",
    icon: "💬",
    columns: 1,
  },
];

export const relocationTestimonialsSections: TemplateSection[] = [
  {
    id: "testimonials.hero",
    page: "testimonials",
    title: "Hero",
    description: "Wave hero with the headline, paragraph and call button",
    groupIds: ["testimonials.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "testimonials.list",
    page: "testimonials",
    title: "Client Testimonials",
    description: "Right-aligned heading plus the carousel of approved reviews",
    groupIds: ["testimonials.list"],
    order: 1,
    hideable: false,
  },
];
