import { BanknoteArrowDown, CheckCircle, Users } from "lucide-react";

import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

///HOMEPAGE
const homepageHeroData: TemplateField[] = [
  {
    key: "bamboo.homepage.hero-title",
    label: "Homepage Hero Title",
    description: "Title for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Elevate Your Everyday",
    placeholder: "Elevate Your Everyday",
  },
  {
    key: "bamboo.homepage.hero-tagline",
    label: "Homepage Hero Tagline",
    description: "Tagline for the hero section, above the title.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Everyday Essential Household Bamboo Product",
    placeholder: "Everyday Essential Household Bamboo Product",
  },
  {
    key: "bamboo.homepage.hero-image",
    label: "Homepage Hero Image",
    description:
      "This image is used as the main focal point of the hero section.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.homepage.hero-background",
    label: "Homepage Hero Background",
    description:
      "This image is used as the background texture of the hero section. Defaults to a subtle tan color if no image is provided.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.homepage.hero-description",
    label: "Homepage Hero Description",
    description: "Description for the hero section",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    placeholder: "Luxuriously soft, tree-free bamboo paper products crafted...",
    defaultValue: `Luxuriously soft, tree-free bamboo paper products crafted in Detroit.
      Because what you bring into your home should be as thoughtful as the life you build in it.`,
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
    description: "Secondary button text (e.g. Our Story)",
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

const homepageFeaturedData: TemplateField[] = [
  {
    key: "bamboo.homepage.featured-title",
    label: "Featured Section Title",
    description: "Title for the featured products section",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    defaultValue: "Our Curated Collection",
    placeholder: "Our Curated Collection",
    gridColumn: "col-span-full",
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
];

const homepageAboutTeaserData: TemplateField[] = [
  {
    key: "bamboo.homepage.about-teaser-heading",
    label: "About Teaser Heading",
    description: "Heading for the about teaser block",
    type: "text",
    page: "homepage",
    gridColumn: "col-span-full",
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
    key: "bamboo.homepage.testimonials-heading",
    label: "Testimonials Heading",
    description: "Heading for the homepage testimonials section",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "What Our Customers Say",
    placeholder: "What Our Customers Say",
  },
];

const homepageLocationData: TemplateField[] = [
  {
    key: "bamboo.homepage.location-heading",
    label: "Location Heading",
    description: "Heading for the location section",
    type: "text",
    page: "homepage",
    group: "homepage.location",
    gridColumn: "col-span-full",
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

export const homepageBambooData = [
  ...homepageHeroData,
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
