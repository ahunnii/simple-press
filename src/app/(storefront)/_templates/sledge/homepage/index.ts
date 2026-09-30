import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// NOTE: field keys keep the `sledge.*` prefix (the Sledge template was cloned
// from Noise and the storefront components read these keys). Only the labels,
// defaults, and grouping are Judy-specific. See sledge-homepage.tsx for usage.

// ─── Homepage: Hero (animated mosaic gallery) ─────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "sledge.homepage.intro-gallery",
    label: "Hero gallery",
    description:
      "Photos shown in the animated mosaic at the top of the homepage. They animate in on page load. Use up to 8 striking product shots.",
    type: "gallery",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "sledge.homepage.hero-tagline",
    label: "Tagline",
    description: "Italic line shown below the mosaic.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "BE DIFFERENT.  BE UNIQUELY YOU.  BE OUTRAGEOUS.",
  },
  {
    key: "sledge.homepage.hero-primary-button-text",
    label: "Button text",
    description: "Label for the button below the tagline.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "What's New",
  },
  {
    key: "sledge.homepage.hero-primary-button-link",
    label: "Button link",
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
    label: "Photo",
    description: "Photo shown beside the introduction section on the homepage.",
    type: "image",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "sledge.homepage.get-to-know-overline",
    label: "Heading",
    description: "Heading for the introduction section on the homepage.",
    type: "text",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-full",
    defaultValue: "Get to Know Judy",
  },
  {
    key: "sledge.homepage.get-to-know-quote",
    label: "Body",
    description:
      "Short introduction shown beside the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-full",
    defaultValue:
      "Judy Sledge is an incredible clothing designer who uses the chemistry of wool & fabrics to make unique pieces, that not only look amazing but are a true work of art.",
  },
  {
    key: "sledge.homepage.get-to-know-button-1-text",
    label: "Button 1 text",
    description:
      "Text for the first button below the body text. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-1",
    defaultValue: "Find Out More",
  },
  {
    key: "sledge.homepage.get-to-know-button-1-link",
    label: "Button 1 link",
    description: "Where the first button points.",
    type: "url",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },
  {
    key: "sledge.homepage.get-to-know-button-2-text",
    label: "Button 2 text",
    description:
      "Text for the second button below the body text. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-1",
    defaultValue: "Contact Judy",
  },
  {
    key: "sledge.homepage.get-to-know-button-2-link",
    label: "Button 2 link",
    description: "Where the second button points.",
    type: "url",
    page: "homepage",
    group: "homepage.getToKnow",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
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
    label: "Photo",
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
    label: "Heading",
    description: "Heading for the newsletter signup section.",
    type: "text",
    page: "homepage",
    group: "homepage.subscribe",
    gridColumn: "col-span-full",
    defaultValue: "Subscribe for the latest drops",
  },
  {
    key: "sledge.homepage-guarantee-quote",
    label: "Body",
    description: "Short copy shown below the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.subscribe",
    gridColumn: "col-span-full",
    defaultValue: "",
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
    title: "Hero",
    description: "Animated photo mosaic, tagline, and button at the top.",
    icon: "🎨",
    columns: 2,
  },
  {
    id: "homepage.getToKnow",
    title: "Introduction",
    description: "Intro section with image, heading, body text, and buttons.",
    icon: "👋",
    columns: 1,
  },
  {
    id: "homepage.testimonials",
    title: "Testimonials",
    description: "Customer quote section heading.",
    icon: "💬",
    columns: 1,
  },
  {
    id: "homepage.subscribe",
    title: "Subscribe",
    description: "Newsletter signup section and its image.",
    icon: "✉️",
    columns: 1,
  },
];
