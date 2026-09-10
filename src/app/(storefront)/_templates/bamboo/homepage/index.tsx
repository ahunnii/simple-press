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
const homepageHeroData: TemplateField[] = [
  {
    key: "bamboo.homepage.hero-title",
    label: "Homepage Hero Title (line one)",
    description:
      "First line of the two-line hero headline. Rendered in deep forest green.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Soft to You.",
    placeholder: "Soft to You.",
  },
  {
    key: "bamboo.homepage.hero-title-accent",
    label: "Homepage Hero Title (line two)",
    description:
      "Second line of the hero headline, set in gold directly beneath line one.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Kind to Earth.",
    placeholder: "Kind to Earth.",
  },
  {
    key: "bamboo.homepage.hero-tagline",
    label: "Homepage Hero Tagline",
    description:
      "Small gold kicker above the hero headline. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Purpose in Every Roll",
    placeholder: "Purpose in Every Roll",
  },
  {
    key: "bamboo.homepage.hero-image",
    label: "Homepage Hero Image",
    description:
      "Photograph shown beside the hero headline, in an arched frame. This is the main focal point of the hero section.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.homepage.hero-bg-image",
    label: "Homepage Hero Background Image",
    description:
      "Optional photo that fills the whole hero band behind the headline and hero image. When set, the hero image loses its arched frame and floats over the scene, and a cream wash keeps the text readable. Leave empty for the solid cream look.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "bamboo.homepage.hero-description",
    label: "Homepage Hero Description",
    description: "Short paragraph below the hero headline.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    placeholder: "Premium bamboo paper that's eco-friendly...",
    defaultValue:
      "Premium bamboo paper that's eco-friendly, chemical-free, and made for your family and our future.",
  },
  {
    key: "bamboo.homepage.hero-badges",
    label: "Hero Badges",
    description:
      "Small icon badges in a row beneath the hero copy (icon + short caption per item, up to 6). Deleting every row reverts to the default badges shown here rather than hiding the row.",
    type: "list",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown inside the outlined circle",
      },
      {
        key: "title",
        label: "Caption",
        type: "text",
        description: "Short uppercase caption, e.g. Chemical Free",
      },
      {
        key: "description",
        label: "Supporting line",
        type: "text",
        description: "Optional. Leave blank for a caption-only badge.",
      },
    ],
    minItems: 0,
    maxItems: 6,
  },
  {
    key: "bamboo.homepage.hero-primary-button-text",
    label: "Hero Primary Button Text",
    description: "Primary CTA button text (e.g. Shop Now)",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
    placeholder: "Shop Now",
  },
  {
    key: "bamboo.homepage.hero-primary-button-link",
    label: "Hero Primary Button Link",
    description: "Primary CTA button URL",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    placeholder: "/shop",
    defaultValue: "/shop",
  },
  {
    key: "bamboo.homepage.hero-secondary-button-text",
    label: "Hero Secondary Button Text",
    description: "Quiet text link beside the primary CTA (e.g. Our Story)",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    placeholder: "Our Story",
    defaultValue: "Our Story",
  },
  {
    key: "bamboo.homepage.hero-secondary-button-link",
    label: "Hero Secondary Button Link",
    description: "Secondary button URL",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    placeholder: "/about",
    defaultValue: "/about",
  },
];

const homepageValueBandData: TemplateField[] = [
  {
    key: "bamboo.homepage.value-band-items",
    label: "Value Band Items",
    description:
      "Four short value statements shown on the deep green band directly below the hero. To hide the whole band, use its section visibility toggle — deleting every row reverts to the defaults shown here instead of hiding it.",
    type: "list",
    page: "homepage",
    group: "homepage.valueBand",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown inside the gold outlined circle",
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
        description: "Optional. Leave blank for a statement-only item.",
      },
    ],
    minItems: 0,
    maxItems: 4,
  },
];

const homepageFeaturedData: TemplateField[] = [
  {
    key: "bamboo.homepage.featured-eyebrow",
    label: "Featured Section Eyebrow",
    description:
      "Small gold label above the featured products heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "The Collection",
    placeholder: "The Collection",
  },
  {
    key: "bamboo.homepage.featured-title",
    label: "Featured Section Title",
    description: "Title for the featured products section",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "Our Curated Collection",
    placeholder: "Our Curated Collection",
    gridColumn: "col-span-1",
  },
  {
    key: "bamboo.homepage.featured-description",
    label: "Featured Section Description",
    description: "Description below the featured section title",
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
    label: "Featured Section Button Text",
    description: "Label for the link to the full shop below the product grid",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "View All Products",
    placeholder: "View All Products",
  },
];

const homepageAboutTeaserData: TemplateField[] = [
  {
    key: "bamboo.homepage.about-teaser-eyebrow",
    label: "About Teaser Eyebrow",
    description:
      "Small gold label above the about teaser heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-1",
    defaultValue: "Our Story",
    placeholder: "Our Story",
  },
  {
    key: "bamboo.homepage.about-teaser-heading",
    label: "About Teaser Heading",
    description: "Heading for the about teaser block",
    type: "text",
    page: "homepage",
    gridColumn: "col-span-1",
    group: "homepage.aboutTeaser",
    defaultValue: "From Detroit, With Purpose",
    placeholder: "From Detroit, With Purpose",
  },
  {
    key: "bamboo.homepage.about-teaser-body",
    label: "About Teaser Body",
    description: "Body text for the about teaser",
    type: "textarea",
    page: "homepage",
    gridColumn: "col-span-full",
    group: "homepage.aboutTeaser",
    placeholder: "We started our business with a simple belief...",
    defaultValue: `We started our business with a simple belief:
        the everyday products in your home should be better -- better for your
        family, and better for the planet. Our roots in Detroit drive everything we do.`,
  },
  {
    key: "bamboo.homepage.about-teaser-button-text",
    label: "About Teaser Button Text",
    description: "Learn More button text",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "Learn More",
  },
  {
    key: "bamboo.homepage.about-teaser-button-link",
    label: "About Teaser Button Link",
    description: "Link for the about teaser button",
    type: "url",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "/about",
    placeholder: "/about",
  },
];

const homepageSustainabilityData: TemplateField[] = [
  {
    key: "bamboo.homepage.sustainability-eyebrow",
    label: "Sustainability Eyebrow",
    description:
      "Small gold label above the sustainability banner heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.sustainability",
    gridColumn: "col-span-1",
    defaultValue: "Our Standard",
    placeholder: "Our Standard",
  },
  {
    key: "bamboo.homepage.sustainability-heading",
    label: "Sustainability Heading",
    description: "Heading on the deep green sustainability banner",
    type: "text",
    page: "homepage",
    group: "homepage.sustainability",
    gridColumn: "col-span-1",
    defaultValue: "Made With Intention",
    placeholder: "Made With Intention",
  },
  {
    key: "bamboo.homepage.sustainability-list",
    label: "Sustainability Cards",
    description:
      "Cards for the Sustainability Banner section (icon, title, and description per item).",
    type: "list",
    page: "homepage",
    group: "homepage.sustainability",
    gridColumn: "col-span-full",

    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Icon shown on the card",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Card heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text",
      },
    ],
    minItems: 0,
    maxItems: 4,
  },
];

const homepageTestimonialsData: TemplateField[] = [
  {
    key: "bamboo.homepage.testimonials-eyebrow",
    label: "Testimonials Eyebrow",
    description:
      "Small gold label above the testimonials heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-1",
    defaultValue: "Testimonials",
    placeholder: "Testimonials",
  },
  {
    key: "bamboo.homepage.testimonials-heading",
    label: "Testimonials Heading",
    description: "Heading for the homepage testimonials section",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-1",
    defaultValue: "What Our Customers Say",
    placeholder: "What Our Customers Say",
  },
  {
    key: "bamboo.homepage.testimonials-button-text",
    label: "Testimonials Button Text",
    description:
      "Label for the link to the full testimonials page below the quotes",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-1",
    defaultValue: "Read All Testimonials",
    placeholder: "Read All Testimonials",
  },
];

const homepageLocationData: TemplateField[] = [
  {
    key: "bamboo.homepage.location-eyebrow",
    label: "Location Eyebrow",
    description:
      "Small gold label above the location heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.location",
    gridColumn: "col-span-1",
    defaultValue: "Visit Us",
    placeholder: "Visit Us",
  },
  {
    key: "bamboo.homepage.location-heading",
    label: "Location Heading",
    description: "Heading for the location section",
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

export const homepageBambooData = [
  ...homepageHeroData,
  ...homepageValueBandData,
  ...homepageFeaturedData,
  ...homepageAboutTeaserData,
  ...homepageSustainabilityData,
  ...homepageTestimonialsData,
  ...homepageLocationData,
];

export const bambooHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero Section",
    description: "Main banner area at the top of homepage",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.valueBand",
    title: "Value Band",
    description:
      "Deep green band of four value statements under the hero wave.",
    icon: "🌊",
    columns: 2,
  },
  {
    id: "homepage.featured",
    title: "Featured Products",
    description: "Featured products section title and description",
    icon: "📦",
    columns: 2,
  },
  {
    id: "homepage.aboutTeaser",
    title: "About Teaser",
    description: "About teaser block on homepage",
    icon: "📄",
    columns: 2,
  },
  {
    id: "homepage.sustainability",
    title: "Sustainability Banner",
    description:
      "Three feature highlights (e.g. Premium Quality, Competitive Prices)",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "homepage.location",
    title: "Location Section",
    description: "Location heading on homepage",
    icon: "📍",
    columns: 2,
  },
  {
    id: "homepage.testimonials",
    title: "Testimonials",
    description:
      "Heading for the testimonials section. Testimonials themselves are managed under Admin → Testimonials.",
    icon: "💬",
    columns: 2,
  },
];
