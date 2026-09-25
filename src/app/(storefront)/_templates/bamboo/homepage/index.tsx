import {
  BanknoteArrowDown,
  CheckCircle,
  Droplets,
  FlaskConical,
  Globe,
  Heart,
  Leaf,
  ShieldCheck,
  TreePine,
  Users,
} from "lucide-react";

import type {
  GenericIconRow,
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";

///HOMEPAGE

// Hero — split into two groups: `homepage.hero` (copy & buttons, in the
// order they read on the page) and `homepage.heroImage` (the photo fields).
// Both groups render under the single `homepage.hero` section — see
// `../sections.ts` — so the field-panel header shows both group headers.
const homepageHeroData: TemplateField[] = [
  {
    key: "bamboo.homepage.hero-tagline",
    label: "Small label",
    description: "Short text above the headline. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Purpose in Every Roll",
    placeholder: "Purpose in Every Roll",
  },
  {
    key: "bamboo.homepage.hero-title",
    label: "Headline, first line",
    description: "First line of the two-line headline.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Soft to You.",
    placeholder: "Soft to You.",
  },
  {
    key: "bamboo.homepage.hero-title-accent",
    label: "Headline, second line",
    description: "Shown under the first line in the accent colour.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Kind to Earth.",
    placeholder: "Kind to Earth.",
  },
  {
    key: "bamboo.homepage.hero-description",
    label: "Intro text",
    description: "Short paragraph below the headline.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    placeholder: "Premium bamboo paper that's eco-friendly...",
    defaultValue:
      "Premium bamboo paper that's eco-friendly, chemical-free, and made for your family and our future.",
  },
  {
    key: "bamboo.homepage.hero-primary-button-text",
    label: "Primary button text",
    description: "Text on the main button, e.g. Shop Now.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "Shop Now",
  },
  {
    key: "bamboo.homepage.hero-primary-button-link",
    label: "Primary button link",
    description: "Where the button goes, e.g. /shop.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    placeholder: "/shop",
    defaultValue: "/shop",
  },
  {
    key: "bamboo.homepage.hero-secondary-button-text",
    label: "Secondary button text",
    description:
      "Text for the quiet text link beside the main button, e.g. Our Story. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    placeholder: "Our Story",
    defaultValue: "Our Story",
  },
  {
    key: "bamboo.homepage.hero-secondary-button-link",
    label: "Secondary button link",
    description: "Where the link goes, e.g. /about.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    placeholder: "/about",
    defaultValue: "/about",
  },
  {
    key: "bamboo.homepage.hero-show-badges",
    label: "Show badges",
    description:
      "Show the row of small badges below the intro text. Turn off to hide them without deleting your badge list below.",
    type: "boolean",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "bamboo.homepage.hero-badges",
    label: "Badges",
    description:
      "Row of small icon badges below the intro text, up to 6. To hide them, turn off Show badges.",
    type: "list",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    visibleWhen: { key: "bamboo.homepage.hero-show-badges", equals: "true" },
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown inside the outlined circle.",
      },
      {
        key: "title",
        label: "Caption",
        type: "text",
        description: "Short caption, e.g. Chemical Free.",
      },
      {
        key: "description",
        label: "Supporting line",
        type: "text",
        description: "Smaller text under the caption.",
        optional: true,
      },
    ],
    minItems: 0,
    maxItems: 6,
    itemLabel: "badge",
    defaultsWhenEmpty: true,
  },
  {
    key: "bamboo.homepage.hero-image",
    label: "Hero photo",
    description:
      "The main photo in the hero, normally shown in an arched frame. When a background photo is set below, this photo floats over it instead, without the frame. Remove this image to let the background photo stand alone.",
    type: "image",
    page: "homepage",
    group: "homepage.heroImage",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.homepage.hero-bg-image",
    label: "Background photo",
    description:
      "Optional photo that fills the whole hero area behind the headline. When set, a translucent overlay keeps the text readable (adjust with Photo fade below), and the hero photo above (if one is set) floats over it without its frame. Leave this blank for the plain look.",
    type: "image",
    page: "homepage",
    group: "homepage.heroImage",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "bamboo.homepage.hero-bg-tint",
    label: "Background tint",
    description:
      "Optional colour overlay blended over the background photo, for mood. Only applies when a background photo is set above. Choose Clear to remove it.",
    type: "color",
    page: "homepage",
    group: "homepage.heroImage",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "bamboo.homepage.hero-show-full-photo",
    label: "Show the whole photo",
    description:
      "Removes the fade behind the text so the entire background photo shows. Check that the text stays readable on your photo. Only applies when a background photo is set above.",
    type: "boolean",
    page: "homepage",
    group: "homepage.heroImage",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
  {
    key: "bamboo.homepage.hero-wash-strength",
    label: "Photo fade",
    description:
      "How strongly the background photo is faded behind the hero text. 100% is the standard look and keeps text easy to read (recommended); lower values show more of the photo, but text may become harder to read. Only applies when a background photo is set above and Show the whole photo is off.",
    type: "number",
    page: "homepage",
    group: "homepage.heroImage",
    gridColumn: "col-span-1",
    defaultValue: "100",
    control: "slider",
    min: 0,
    max: 100,
    step: 5,
    unit: "%",
    visibleWhen: {
      key: "bamboo.homepage.hero-show-full-photo",
      equals: "false",
    },
  },
];

const homepageValueBandData: TemplateField[] = [
  {
    key: "bamboo.homepage.value-band-items",
    label: "Statements",
    description:
      "Up to four short statements shown on the band directly below the hero. To hide the band, turn off this section's visibility.",
    type: "list",
    page: "homepage",
    group: "homepage.valueBand",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown inside the outlined circle.",
      },
      {
        key: "title",
        label: "Statement",
        type: "text",
        description: "One short sentence, e.g. Better for you.",
      },
      {
        key: "description",
        label: "Supporting line",
        type: "text",
        description: "Smaller text under the statement.",
        optional: true,
      },
    ],
    minItems: 0,
    maxItems: 4,
    itemLabel: "statement",
    defaultsWhenEmpty: true,
  },
];

const homepageAboutTeaserData: TemplateField[] = [
  {
    key: "bamboo.homepage.about-teaser-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-1",
    defaultValue: "Our Story",
    placeholder: "Our Story",
  },
  {
    key: "bamboo.homepage.about-teaser-heading",
    label: "Heading",
    description: "Heading for the story preview block.",
    type: "text",
    page: "homepage",
    gridColumn: "col-span-1",
    group: "homepage.aboutTeaser",
    defaultValue: "From Detroit, With Purpose",
    placeholder: "From Detroit, With Purpose",
  },
  {
    key: "bamboo.homepage.about-teaser-body",
    label: "Body text",
    description: "Paragraph below the heading, introducing your story.",
    type: "textarea",
    page: "homepage",
    gridColumn: "col-span-full",
    group: "homepage.aboutTeaser",
    placeholder: "We started our business with a simple belief...",
    defaultValue:
      "We started our business with a simple belief: the everyday products in your home should be better -- better for your family, and better for the planet. Our roots in Detroit drive everything we do.",
  },
  {
    key: "bamboo.homepage.about-teaser-button-text",
    label: "Button text",
    description:
      "Label for the link to your full About page. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-1",
    defaultValue: "Learn More",
  },
  {
    key: "bamboo.homepage.about-teaser-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /about.",
    type: "url",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-1",
    defaultValue: "/about",
    placeholder: "/about",
  },
];

const homepageFeaturedData: TemplateField[] = [
  {
    key: "bamboo.homepage.featured-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "The Collection",
    placeholder: "The Collection",
  },
  {
    key: "bamboo.homepage.featured-title",
    label: "Heading",
    description: "Heading for the featured products section.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "Our Curated Collection",
    placeholder: "Our Curated Collection",
    gridColumn: "col-span-1",
  },
  {
    key: "bamboo.homepage.featured-description",
    label: "Intro text",
    description: "Short text below the heading, above the product grid.",
    type: "textarea",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-full",
    placeholder: "Every product is 100% bamboo...",
    defaultValue:
      "Every product is 100% bamboo, tree-free, and crafted to the highest standard. No compromises.",
  },
  {
    key: "bamboo.homepage.featured-button-text",
    label: "Button text",
    description:
      "Label for the link to the full shop, shown below the product grid. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "View All Products",
    placeholder: "View All Products",
  },
  {
    key: "bamboo.homepage.featured-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /shop.",
    type: "url",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

const homepageSustainabilityData: TemplateField[] = [
  {
    key: "bamboo.homepage.sustainability-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.sustainability",
    gridColumn: "col-span-1",
    defaultValue: "Our Standard",
    placeholder: "Our Standard",
  },
  {
    key: "bamboo.homepage.sustainability-heading",
    label: "Heading",
    description: "Heading on the dark banner below the featured products.",
    type: "text",
    page: "homepage",
    group: "homepage.sustainability",
    gridColumn: "col-span-1",
    defaultValue: "Made With Intention",
    placeholder: "Made With Intention",
  },
  {
    key: "bamboo.homepage.sustainability-list",
    label: "Highlights",
    description:
      "Up to four highlight cards on the banner (icon, title, and description per item).",
    type: "list",
    page: "homepage",
    group: "homepage.sustainability",
    gridColumn: "col-span-full",

    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown on the card.",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading.",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text.",
        optional: true,
      },
    ],
    minItems: 0,
    maxItems: 4,
    itemLabel: "highlight",
    defaultsWhenEmpty: true,
  },
];

const homepageTestimonialsData: TemplateField[] = [
  {
    key: "bamboo.homepage.testimonials-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-1",
    defaultValue: "Testimonials",
    placeholder: "Testimonials",
  },
  {
    key: "bamboo.homepage.testimonials-heading",
    label: "Heading",
    description: "Heading for the homepage testimonials section.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-1",
    defaultValue: "What Our Customers Say",
    placeholder: "What Our Customers Say",
  },
  {
    key: "bamboo.homepage.testimonials-button-text",
    label: "Button text",
    description:
      "Label for the link to the full testimonials page, shown below the quotes. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-1",
    defaultValue: "Read All Testimonials",
    placeholder: "Read All Testimonials",
  },
  {
    key: "bamboo.homepage.testimonials-button-link",
    label: "Button link",
    description: "Where the button goes, e.g. /testimonials.",
    type: "url",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-1",
    defaultValue: "/testimonials",
    placeholder: "/testimonials",
  },
];

const homepageLocationData: TemplateField[] = [
  {
    key: "bamboo.homepage.location-eyebrow",
    label: "Small label",
    description: "Short text above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.location",
    gridColumn: "col-span-1",
    defaultValue: "Visit Us",
    placeholder: "Visit Us",
  },
  {
    key: "bamboo.homepage.location-heading",
    label: "Heading",
    description: "Heading above the map.",
    type: "text",
    page: "homepage",
    group: "homepage.location",
    gridColumn: "col-span-1",
    defaultValue: "Our Location",
    placeholder: "Our Location",
  },
];

export const DEFAULT_BAMBOO_FEATURES = [
  {
    icon: CheckCircle,
    title: "Premium Quality",
    description:
      "Experience top-quality household paper products, crafted for comfort and reliability.",
  },
  {
    icon: BanknoteArrowDown,
    title: "Competitive Prices",
    description: "Affordable prices without compromising quality.",
  },
  {
    icon: Users,
    title: "Customer-Centric Approach",
    description: "Your satisfaction comes first in everything we do.",
  },
];

/** Icon badge row under the hero copy — caption-only rows by design. */
export const DEFAULT_BAMBOO_HERO_BADGES: GenericIconRow[] = [
  { icon: Leaf, title: "Made from 100% Bamboo", description: "" },
  { icon: FlaskConical, title: "Chemical Free", description: "" },
  { icon: ShieldCheck, title: "Hypoallergenic & Safe", description: "" },
  { icon: Droplets, title: "Septic Safe", description: "" },
  {
    icon: TreePine,
    title: "Tree Free",
    description: "Better for You & Our Planet",
  },
];

/** Deep green value band directly below the hero — caption-only rows by design. */
export const DEFAULT_BAMBOO_VALUE_BAND: GenericIconRow[] = [
  {
    icon: Leaf,
    title: "Better for you. Better for our planet.",
    description: "",
  },
  {
    icon: Users,
    title: "Safe for your family. Good for every home.",
    description: "",
  },
  {
    icon: Heart,
    title: "Supporting communities. Building generational wealth.",
    description: "",
  },
  {
    icon: Globe,
    title: "Healthier communities — one roll at a time.",
    description: "",
  },
];

// Declaration order mirrors render order: hero → valueBand → aboutTeaser →
// featured → sustainability → testimonials → location (see
// `bamboo-homepage.tsx`).
export const homepageBambooData = [
  ...homepageHeroData,
  ...homepageValueBandData,
  ...homepageAboutTeaserData,
  ...homepageFeaturedData,
  ...homepageSustainabilityData,
  ...homepageTestimonialsData,
  ...homepageLocationData,
];

export const bambooHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Text & buttons",
    description: "The headline, intro text, and buttons in the hero.",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.heroImage",
    title: "Hero image & background",
    description: "The hero photo and optional full-bleed background photo.",
    icon: "🖼️",
    columns: 2,
  },
  {
    id: "homepage.valueBand",
    title: "Statements band",
    description:
      "A row of up to four short statements directly below the hero.",
    icon: "🌊",
    columns: 2,
  },
  {
    id: "homepage.aboutTeaser",
    title: "Our story",
    description:
      "Short introduction to your business on the homepage, with a link to the full About page.",
    icon: "📄",
    columns: 2,
  },
  {
    id: "homepage.featured",
    title: "Featured products",
    description:
      "Grid of products from your shop, with a link below to see everything.",
    icon: "📦",
    columns: 2,
  },
  {
    id: "homepage.sustainability",
    title: "Sustainability banner",
    description:
      "Up to four highlight cards below the featured products (e.g. Premium Quality, Competitive Prices).",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "homepage.testimonials",
    title: "Testimonials",
    description:
      "Heading and button text for the testimonials section on the homepage. Testimonials themselves are managed under Admin → Testimonials.",
    icon: "💬",
    columns: 2,
  },
  {
    id: "homepage.location",
    title: "Location",
    description:
      "Heading above the map of your location. The map appears once you set a map pin in Settings → General.",
    icon: "📍",
    columns: 2,
  },
];
