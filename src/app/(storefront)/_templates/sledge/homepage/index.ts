import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// NOTE: field keys keep the `sledge.*` prefix (the Sledge template was cloned
// from Noise and the storefront components read these keys). Only the labels,
// defaults, and grouping are Judy-specific. See sledge-homepage.tsx for usage.

// ─── Homepage: Hero (animated mosaic gallery) ─────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "sledge.homepage.intro-gallery",
    label: "Hero Gallery",
    description:
      "Photos shown in the animated mosaic at the top of the homepage. They animate in on page load. Use up to 8 striking product shots.",
    type: "gallery",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "sledge.homepage.hero-tagline",
    label: "Hero Tagline",
    description: "Italic line shown below the mosaic.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "BE DIFFERENT.  BE UNIQUELY YOU.  BE OUTRAGEOUS.",
  },
  {
    key: "sledge.homepage.hero-primary-button-text",
    label: "Hero Button Text",
    description: "Call-to-action button below the tagline.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "What's New",
  },
  {
    key: "sledge.homepage.hero-primary-button-link",
    label: "Hero Button Link",
    description: "Where the hero button points.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Homepage: Get to Know Judy ───────────────────────────────────────────────

const homepageGetToKnowData: TemplateField[] = [
  {
    key: "sledge.homepage.get-to-know-image",
    label: "Section Image",
    description: "Photo shown on the left of the 'Get to Know Judy' section.",
    type: "image",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "sledge.homepage.get-to-know-overline",
    label: "Heading",
    description: "Heading for the 'Get to Know Judy' section.",
    type: "text",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-full",
    defaultValue: "Get to Know Judy",
  },
  {
    key: "sledge.homepage.get-to-know-quote",
    label: "Body",
    description: "Short introduction shown beside the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-full",
    defaultValue:
      "Judy Sledge is an incredible clothing designer who uses the chemistry of wool & fabrics to make unique pieces, that not only look amazing but are a true work of art.",
  },
];

// ─── Homepage: Testimonials ───────────────────────────────────────────────────

const homepageTestimonialsData: TemplateField[] = [
  {
    key: "sledge.homepage-testimonials-heading",
    label: "Heading",
    description: "Heading for the homepage testimonials section.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "Testimonials",
  },
];

// ─── Homepage: Subscribe ──────────────────────────────────────────────────────

const homepageSubscribeData: TemplateField[] = [
  {
    key: "sledge.homepage-guarantee-image",
    label: "Section Image",
    description:
      "Large photo shown beside the testimonials and subscribe sections.",
    type: "image",
    page: "homepage",
    group: "homepage.subscribe",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "sledge.homepage-guarantee-heading",
    label: "Subscribe Heading",
    description: "Heading for the newsletter signup section.",
    type: "text",
    page: "homepage",
    group: "homepage.subscribe",
    gridColumn: "col-span-full",
    defaultValue: "Subscribe for the latest drops",
  },
  {
    key: "sledge.homepage-guarantee-quote",
    label: "Subscribe Body",
    description: "Short copy above the email signup field.",
    type: "textarea",
    page: "homepage",
    group: "homepage.subscribe",
    gridColumn: "col-span-full",
    defaultValue:
      "Be the first to know about new wearable-art pieces, limited drops, and behind-the-scenes studio moments.",
  },
];

export const sledgeHomepageData = [
  ...homepageHeroData,
  ...homepageGetToKnowData,
  ...homepageTestimonialsData,
  ...homepageSubscribeData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const sledgeHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero Mosaic",
    description: "Animated photo mosaic, tagline, and button at the top",
    icon: "🎨",
    columns: 2,
  },
  {
    id: "homepage.getToKnow",
    title: "Get to Know Judy",
    description: "Intro section about Judy",
    icon: "👋",
    columns: 1,
  },
  {
    id: "homepage.testimonials",
    title: "Testimonials",
    description: "Customer quote section heading",
    icon: "💬",
    columns: 1,
  },
  {
    id: "homepage.subscribe",
    title: "Subscribe",
    description: "Newsletter signup section and its image",
    icon: "✉️",
    columns: 1,
  },
];
