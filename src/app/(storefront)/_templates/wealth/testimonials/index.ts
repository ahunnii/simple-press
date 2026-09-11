import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// ─── Hero — "Co-ops We Support" — NOT hideable ─────────────────────────────

const testimonialsHeroData: TemplateField[] = [
  {
    key: "wealth.testimonials.hero-heading",
    label: "Page Heading",
    description: "The page's H1.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Co-ops We Support",
  },
  {
    key: "wealth.testimonials.hero-intro",
    label: "Intro Text",
    description: "Short paragraph below the heading.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Below are co-ops that have completed DCWF's co-op incubator or received financing from DCWF.",
  },
  {
    key: "wealth.testimonials.hero-link-label",
    label: "Secondary Link Label",
    description: "Label for the external directory link below the intro.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Explore more co-ops in the Cooperative Economic Network of Detroit Co-op Directory",
  },
  {
    key: "wealth.testimonials.hero-link-url",
    label: "Secondary Link URL",
    description: "Where the directory link sends visitors.",
    type: "url",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-1",
    defaultValue: "https://www.cendetroit.com/",
  },
  {
    key: "wealth.testimonials.hero-image",
    label: "Hero Image",
    description:
      "Optional overlap-hero image above the intro. Leave blank to hide.",
    type: "image",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/coops-hero.jpg",
  },
  {
    key: "wealth.testimonials.hero-image-alt",
    label: "Hero Image Alt Text",
    description: "Alt text for the hero image, for screen readers.",
    type: "text",
    page: "testimonials",
    group: "testimonials.hero",
    gridColumn: "col-span-full",
    defaultValue: "Members of a co-op supported by Detroit Community Wealth Fund",
  },
];

// ─── Co-op logo grid — hideable ─────────────────────────────────────────────

const testimonialsCoopsData: TemplateField[] = [
  {
    key: "wealth.testimonials.coops",
    label: "Co-op Logos",
    description:
      "Logos of co-ops DCWF has supported, each linking to the co-op's site. Up to 12. Leave empty to use the built-in example co-ops.",
    type: "list",
    page: "testimonials",
    group: "testimonials.coops",
    gridColumn: "col-span-full",
    maxItems: 12,
    itemSchema: [
      {
        key: "logo",
        label: "Logo",
        type: "image",
        placeholder: "Upload the co-op's logo",
      },
      {
        key: "name",
        label: "Co-op Name",
        type: "text",
        placeholder: "e.g. Brick and Mortar Cooperative",
      },
      {
        key: "url",
        label: "Co-op Website",
        type: "url",
        placeholder: "https://…",
      },
    ],
  },
];

// ─── In their words — DB testimonials, quiet pull-quotes ───────────────────

const testimonialsQuotesData: TemplateField[] = [
  {
    key: "wealth.testimonials.quotes-heading",
    label: "Quotes Heading",
    description: "Italic heading above the testimonial pull-quotes.",
    type: "text",
    page: "testimonials",
    group: "testimonials.quotes",
    gridColumn: "col-span-full",
    defaultValue: "In their words",
  },
  {
    key: "wealth.testimonials.quotes-empty-message",
    label: "Empty State Message",
    description:
      "Shown in place of the quotes when there are no approved testimonials yet.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.quotes",
    gridColumn: "col-span-full",
    defaultValue:
      "Are you a co-op we've worked with? We'd love to hear from you.",
  },
];

// ─── Closing CTA — hideable ─────────────────────────────────────────────────

const testimonialsCtaData: TemplateField[] = [
  {
    key: "wealth.testimonials.cta-heading",
    label: "CTA Heading",
    description: "Heading for the closing call-to-action band.",
    type: "text",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue: "Are you a co-op we've supported?",
  },
  {
    key: "wealth.testimonials.cta-body",
    label: "CTA Body",
    description: "Short invitation encouraging co-ops to submit their story.",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "We'd love to feature your story alongside the co-ops above — tell us how DCWF's financing or incubator program helped your business grow.",
  },
  {
    key: "wealth.testimonials.cta-button-label",
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

export const wealthTestimonialsData: TemplateField[] = [
  ...testimonialsHeroData,
  ...testimonialsCoopsData,
  ...testimonialsQuotesData,
  ...testimonialsCtaData,
];

export const wealthTestimonialsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "testimonials.hero",
    title: "Co-ops We Support",
    description: "Page heading, intro, directory link, and optional hero image",
    icon: "🌾",
    columns: 2,
  },
  {
    id: "testimonials.coops",
    title: "Co-op Logo Grid",
    description: "Logos of the co-ops DCWF has supported",
    icon: "🏷️",
    columns: 1,
  },
  {
    id: "testimonials.quotes",
    title: "In Their Words",
    description: "Heading and empty-state message for the testimonial quotes",
    icon: "💬",
    columns: 2,
  },
  {
    id: "testimonials.cta",
    title: "Share Your Story CTA",
    description: "Closing call-to-action inviting co-ops to submit their story",
    icon: "✍️",
    columns: 2,
  },
];

export const wealthTestimonialsSections: TemplateSection[] = [
  {
    id: "testimonials.hero",
    page: "testimonials",
    title: "Co-ops We Support",
    description: "Heading, intro, and directory link",
    groupIds: ["testimonials.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "testimonials.coops",
    page: "testimonials",
    title: "Co-op Logo Grid",
    description: "Co-op logos linking out",
    groupIds: ["testimonials.coops"],
    order: 1,
    hideable: true,
  },
  {
    id: "testimonials.quotes",
    page: "testimonials",
    title: "In Their Words",
    description: "Approved testimonial pull-quotes, or the empty state",
    groupIds: ["testimonials.quotes"],
    order: 2,
    hideable: false,
  },
  {
    id: "testimonials.cta",
    page: "testimonials",
    title: "Share Your Story CTA",
    description: "Closing call-to-action",
    groupIds: ["testimonials.cta"],
    order: 3,
    hideable: true,
  },
];
