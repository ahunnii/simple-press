import { Droplets, Recycle, Sprout } from "lucide-react";

import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Field module for the bamboo "Illustrated & Alive" homepage. Every default
 * value below is real copy from `docs/templates/bamboo/mockups/content-pack.md`
 * / `content-pack-pages.md`, ported to match
 * `docs/templates/bamboo/build/mockup-refs/mockup-b.elided.html` verbatim
 * where the mockup itself is the styling+copy authority.
 *
 * IMPORTANT: this file stays TYPE-ONLY toward `~/lib/template-fields`
 * (`import type { TemplateField, TemplateFieldGroup }` only). `~/lib/template-fields`
 * imports the template root (`_templates/animated-bamboo/index.tsx`), which imports this
 * file for its field arrays — a VALUE import back into `~/lib/template-fields`
 * from here would be a circular import (see the relocation-template TDZ bug
 * class in project memory). Any code that needs to actually *parse* a list
 * field (via `getListFieldValue`/`parseTemplateIconListRows`/etc, all real
 * value exports of `~/lib/template-fields`) belongs in `bamboo-homepage.tsx`
 * instead, which is NOT part of that import chain.
 */

///HOMEPAGE
const homepageHeroData: TemplateField[] = [
  {
    key: "animated-bamboo.homepage.hero-title",
    label: "Homepage Hero Title",
    description: "Main headline in the hero living scene.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Elevate Your Everyday All Day",
    placeholder: "Elevate Your Everyday All Day",
  },
  {
    key: "animated-bamboo.homepage.hero-tagline",
    label: "Homepage Hero Tagline",
    description:
      "Small uppercase line under the hero's call-to-action buttons (never rendered above the headline).",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Everyday Essential Household Bamboo Product",
    placeholder: "Everyday Essential Household Bamboo Product",
  },
  {
    key: "animated-bamboo.homepage.hero-image",
    label: "Hero Photo",
    description:
      "Optional real photo layered into the hero scene as a tilted photo-card. Leave as the placeholder to show the illustrated scene alone.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "animated-bamboo.homepage.hero-description",
    label: "Homepage Hero Description",
    description: "Supporting sentence under the hero title.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    placeholder: "A Detroit-based, woman-owned business redefining...",
    defaultValue:
      "A Detroit-based, woman-owned business redefining everyday essentials through bamboo toilet tissue — because no family should have to choose between affordable and sustainable.",
  },
  {
    key: "animated-bamboo.homepage.hero-primary-button-text",
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
    key: "animated-bamboo.homepage.hero-primary-button-link",
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
    key: "animated-bamboo.homepage.hero-secondary-button-text",
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
    key: "animated-bamboo.homepage.hero-secondary-button-link",
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
    key: "animated-bamboo.homepage.featured-title",
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
    key: "animated-bamboo.homepage.featured-description",
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
    key: "animated-bamboo.homepage.featured-button-text",
    label: "Featured Footnote Button Text",
    description: "Text for the swipe-underline link below the product grid.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "View All Products",
    placeholder: "View All Products",
  },
  {
    key: "animated-bamboo.homepage.featured-button-link",
    label: "Featured Footnote Button Link",
    description: "URL for the footnote link below the product grid.",
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
    key: "animated-bamboo.homepage.sustainability-heading",
    label: "Why Bamboo Heading",
    description: "Centered heading above the self-drawing timeline.",
    type: "text",
    page: "homepage",
    group: "homepage.sustainability",
    gridColumn: "col-span-full",
    defaultValue: "Why Bamboo",
    placeholder: "Why Bamboo",
  },
  {
    key: "animated-bamboo.homepage.sustainability-intro",
    label: "Why Bamboo Intro",
    description: "One line under the Why Bamboo heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.sustainability",
    gridColumn: "col-span-full",
    defaultValue:
      "The plant behind every roll, and the three things it does differently.",
    placeholder: "The plant behind every roll...",
  },
  {
    key: "animated-bamboo.homepage.sustainability-list",
    label: "Why Bamboo Stations",
    description:
      "The three (up to four) facts drawn along the timeline (icon, title, and description per item). The first three stations render as bespoke illustrations; a fourth item renders its chosen icon inside a plain disc.",
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

const homepageAboutTeaserData: TemplateField[] = [
  {
    key: "animated-bamboo.homepage.about-teaser-heading",
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
    key: "animated-bamboo.homepage.about-teaser-body",
    label: "About Teaser Body",
    description: "Body text for the about teaser",
    type: "textarea",
    page: "homepage",
    gridColumn: "col-span-full",
    group: "homepage.aboutTeaser",
    placeholder: "We started our business with a simple belief...",
    defaultValue:
      "We started our business with a simple belief: the everyday products in your home should be better — better for your family, and better for the planet. Our roots in Detroit drive everything we do.",
  },
  {
    key: "animated-bamboo.homepage.about-teaser-list",
    label: "About Teaser Promises",
    description:
      "Leaf-bulleted list of promises beside the About teaser copy (title + one-liner per item).",
    type: "list",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short promise heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting one-liner",
      },
    ],
    minItems: 0,
    maxItems: 4,
  },
  {
    key: "animated-bamboo.homepage.about-teaser-button-text",
    label: "About Teaser Button Text",
    description: "Learn More button text",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "Learn More",
  },
  {
    key: "animated-bamboo.homepage.about-teaser-button-link",
    label: "About Teaser Button Link",
    description: "Link for the about teaser button",
    type: "url",
    page: "homepage",
    group: "homepage.aboutTeaser",
    defaultValue: "/about",
    placeholder: "/about",
  },
];

const homepageTestimonialsData: TemplateField[] = [
  {
    key: "animated-bamboo.homepage.testimonials-heading",
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
    key: "animated-bamboo.homepage.location-heading",
    label: "Location Heading",
    description: "Heading for the location section",
    type: "text",
    page: "homepage",
    group: "homepage.location",
    gridColumn: "col-span-full",
    defaultValue: "Our Location",
    placeholder: "Our Location",
  },
  {
    key: "animated-bamboo.homepage.location-intro",
    label: "Location Intro",
    description: "One line under the Location heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.location",
    gridColumn: "col-span-full",
    defaultValue:
      "Crafted in Detroit, Michigan — and shipped wherever you are.",
    placeholder: "Crafted in Detroit, Michigan...",
  },
  {
    key: "animated-bamboo.homepage.location-list",
    label: "Location Facts",
    description:
      "Short fact list (title + one-liner) shown beside the illustrated map.",
    type: "list",
    page: "homepage",
    group: "homepage.location",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Fact heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting one-liner",
      },
    ],
    minItems: 0,
    maxItems: 4,
  },
  {
    key: "animated-bamboo.homepage.location-photo",
    label: "Location Photo",
    description:
      "Lifestyle photo tucked over the illustrated map. Leave as the placeholder to show an illustrated fallback instead.",
    type: "image",
    page: "homepage",
    group: "homepage.location",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "animated-bamboo.homepage.location-photo-caption",
    label: "Location Photo Caption",
    description: "Caption under the location photo card.",
    type: "text",
    page: "homepage",
    group: "homepage.location",
    gridColumn: "col-span-full",
    defaultValue: "Delivered to your door, anywhere in the U.S.",
    placeholder: "Delivered to your door, anywhere in the U.S.",
  },
];

/**
 * Default rows for `animated-bamboo.homepage.sustainability-list` — the why-bamboo
 * facts (content-pack.md "Additional truthful facts"). The homepage's
 * why-bamboo timeline renders bespoke station-disc illustrations for the
 * first three positions regardless of `icon`; `icon` is only rendered (as a
 * plain Lucide icon inside a disc) for a fourth owner-added row.
 */
export const DEFAULT_ANIMATED_BAMBOO_WHY_BAMBOO_FACTS = [
  {
    icon: Sprout,
    title: "Rapid Growth",
    description:
      "Bamboo grows up to 35 inches per day and reaches maturity in 3–5 years, compared to 20–50 years for hardwood trees.",
  },
  {
    icon: Recycle,
    title: "No Replanting Needed",
    description:
      "Bamboo regenerates from its own root system after harvest, which means the soil stays intact and carbon continues to be sequestered.",
  },
  {
    icon: Droplets,
    title: "Water Efficient",
    description:
      "Bamboo requires significantly less water than traditional tree farming and thrives without pesticides or fertilizers.",
  },
];

/**
 * Default rows for `animated-bamboo.homepage.about-teaser-list` — the old
 * sustainability trio relocates here per design.md's decisions log.
 */
export const DEFAULT_BAMBOO_PROMISES: { title: string; description: string }[] =
  [
    {
      title: "Premium Quality",
      description:
        "Experience top-quality household paper products, crafted for comfort and reliability.",
    },
    {
      title: "Competitive Prices",
      description: "Affordable prices without compromising quality.",
    },
    {
      title: "Customer-Centric Approach",
      description: "Your satisfaction comes first in everything we do.",
    },
  ];

/** Default rows for `animated-bamboo.homepage.location-list`. */
export const DEFAULT_BAMBOO_LOCATION_FACTS: {
  title: string;
  description: string;
}[] = [
  {
    title: "Nationwide Shipping",
    description: "Orders travel across the United States.",
  },
  {
    title: "Homes & Businesses",
    description: "Restaurants, hotels, schools and local stores.",
  },
  {
    title: "Customer-First Service",
    description: "Our team is based here in Detroit.",
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
    description:
      "The living still-life scene at the top of the homepage, plus headline, lede, and CTA pair.",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "homepage.featured",
    title: "Featured Products",
    description:
      "Featured products section title, description, and footnote CTA.",
    icon: "📦",
    columns: 2,
  },
  {
    id: "homepage.aboutTeaser",
    title: "About Teaser",
    description:
      "About teaser block on homepage, its promises list, and the Detroit vignette.",
    icon: "📄",
    columns: 2,
  },
  {
    id: "homepage.sustainability",
    title: "Why Bamboo Timeline",
    description:
      "The self-drawing why-bamboo timeline: heading, intro, and up to four stations.",
    icon: "🎋",
    columns: 2,
  },
  {
    id: "homepage.location",
    title: "Location Section",
    description:
      "Location heading, intro, fact list, and the illustrated map + photo card.",
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
