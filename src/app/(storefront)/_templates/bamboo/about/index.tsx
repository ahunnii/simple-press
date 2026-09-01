import {
  Building2,
  Feather,
  Heart,
  Leaf,
  ShieldCheck,
  Sprout,
  Truck,
  Users,
} from "lucide-react";

import type {
  GenericIconRow,
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";

/// ABOUT PAGE — "Illustrated & Alive" redesign (docs/templates/bamboo/design.md).
/// Group ids are kept stable from the pre-redesign page so saved owner content
/// survives. `bamboo.about.hero-tagline` is DROPPED (see aboutHeroData below) —
/// its default rendered the excluded "Detroit's Foremost Stationery Store"
/// leftover line, and the new hero has no eyebrow/kicker slot at all.
const aboutHeroData: TemplateField[] = [
  {
    key: "bamboo.about.hero-heading",
    label: "About Hero Heading",
    description: "Main heading for the about page",
    type: "text",
    page: "about",
    group: "about.hero",
    defaultValue: "Finally, Results That Matter",
    placeholder: "Finally, Results That Matter",
  },
  {
    key: "bamboo.about.hero-intro",
    label: "About Hero Intro",
    description: "Intro paragraph below the heading",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: `Finally Results is an eco-conscious company focused on producing sustainable, biodegradable and affordable household essentials. Our first launch — bamboo toilet tissue — offers a soft, chemical-free, hypoallergenic alternative to traditional toilet paper: sustainable, fast growing, renewable, septic safe and plumbing friendly.`,
    placeholder: `Finally Results is an eco-conscious company focused on producing sustainable...`,
  },
  {
    key: "bamboo.about.hero-image",
    label: "About Hero Photo",
    description:
      "Optional — layers as a small tilted photo card into the corner of the Detroit skyline illustration. Leave blank to show the illustration alone.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

const aboutMissionData: TemplateField[] = [
  {
    key: "bamboo.about.mission-heading",
    label: "Why We Started Heading",
    description: "Heading for the Why We Started section",
    type: "text",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    defaultValue: "Why We Started",
    placeholder: "Why We Started",
  },
  {
    key: "bamboo.about.mission-image",
    label: "Why We Started Image",
    description: "Photo shown in a tilted photo-frame beside the founder story",
    type: "image",
    page: "about",
    group: "about.mission",
    defaultValue: "/placeholder.svg",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.about.mission-paragraph",
    label: "Why We Started Text",
    description:
      "The founder story. Both paragraphs render together, separated by a blank line.",
    type: "textarea",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    placeholder: `Finally Results LLC was founded from a desire to create a healthier, more sustainable everyday product...`,
    defaultValue: `Finally Results LLC was founded from a desire to create a healthier, more sustainable everyday product while building a business that creates lasting economic opportunities. I recognized that toilet tissue is a household essential used every day, yet many traditional products contribute to deforestation and contain unnecessary chemicals. I wanted to offer families a better alternative through bamboo toilet tissue that is soft, durable, biodegradable, septic safe, and made from a rapidly renewable resource.

My vision extends beyond selling a product. I founded Finally Results LLC to create jobs, support local communities, encourage environmentally responsible purchasing, and build generational wealth through entrepreneurship. Every package we sell represents our commitment to quality, sustainability, and making eco-friendly products more accessible to everyday families.`,
  },
];

const aboutDetroitData: TemplateField[] = [
  {
    key: "bamboo.about.detroit-heading",
    label: "Detroit Section Heading",
    description: "Rooted in Detroit heading",
    type: "text",
    page: "about",
    group: "about.detroit",
    defaultValue: "Rooted in Detroit",
    placeholder: "Rooted in Detroit",
  },
  {
    key: "bamboo.about.detroit-body",
    label: "Detroit Section Body",
    description: "Detroit roots paragraph",
    type: "textarea",
    page: "about",
    group: "about.detroit",
    gridColumn: "col-span-full",
    placeholder: `Detroit is a city that understands transformation...`,
    defaultValue:
      "Detroit is a city that understands transformation. From the automotive revolution to its current renaissance in art, technology, and small business, this city teaches you that great things are built through perseverance and purpose. We chose to build Finally Results here because Detroit embodies everything our brand stands for: quality craftsmanship, community, and the belief that you can always do better.",
  },
];

const aboutValuesData: TemplateField[] = [
  {
    key: "bamboo.about.values-heading",
    label: "Values Section Heading",
    description: "What We Stand For heading",
    type: "text",
    page: "about",
    group: "about.values",
    defaultValue: "What We Stand For",
    placeholder: "What We Stand For",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.about.values-list",
    label: "Values List",
    description:
      "Leaf-bulleted list beside the illustrated vignette (title and description per item; up to 3).",
    type: "list",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description:
          "Stored for compatibility; the list renders a leaf mark instead.",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Value heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text",
      },
    ],
    minItems: 0,
    maxItems: 3,
  },
];

const aboutWhyBambooData: TemplateField[] = [
  {
    key: "bamboo.about.why-bamboo-heading",
    label: "Why Bamboo Heading",
    description: "Why Bamboo? section heading",
    type: "text",
    page: "about",
    group: "about.whyBamboo",
    defaultValue: "Why Bamboo?",
    placeholder: "Why Bamboo?",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.about.why-bamboo-intro",
    label: "Why Bamboo Intro",
    description: "Intro line for Why Bamboo section",
    type: "textarea",
    page: "about",
    group: "about.whyBamboo",
    gridColumn: "col-span-full",
    placeholder:
      "Bamboo Toilet Tissue is a sustainable alternative to traditional toilet tissue made from bamboo grass...",
    defaultValue:
      "Bamboo Toilet Tissue is a sustainable alternative to traditional toilet tissue made from bamboo grass. Bamboo is fast growing with several benefits:",
  },
  {
    key: "bamboo.about.why-bamboo-facts-list",
    label: "Why Bamboo Facts List",
    description:
      "Cards for the Why Bamboo section (icon, title, and description per item).",
    type: "list",
    page: "about",
    group: "about.whyBamboo",
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
    maxItems: 3,
  },
];

/// Made hideable per the "Illustrated & Alive" redesign — the new mockup folds
/// most of this content into the Values band, so a store using that exact
/// layout can hide this band without losing the field/data underneath it.
const aboutSupplierData: TemplateField[] = [
  {
    key: "bamboo.about.supplier-heading",
    label: "Supplier Heading",
    description: "Heading for the More Than a Supplier prose band",
    type: "text",
    page: "about",
    group: "about.supplier",
    defaultValue: "More Than a Supplier",
    placeholder: "More Than a Supplier",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.about.supplier-text",
    label: "Supplier Text",
    description: "Text for the Supplier section",
    type: "textarea",
    page: "about",
    gridColumn: "col-span-full",
    group: "about.supplier",
    defaultValue: `At Finally Results LLC, our commitment extends beyond transactions. We take pride in providing top-notch household paper products that cater to a wide spectrum of needs -- from individual households to restaurants, hotels, schools, gas stations, local stores, and businesses of all sizes.

We operate with the ethos of respecting every customer, valuing the relationships we build, and contributing to the collective well-being of the communities we serve. Located in the heart of Detroit, we extend our warmest welcome to you -- every customer is a member of our extended family.`,
    placeholder: "Here, our commitment extends beyond transactions...",
  },
  {
    key: "bamboo.about.supplier-image",
    label: "Supplier Image (unused)",
    description:
      "Kept for saved-data compatibility. The redesigned Supplier section is a text-only prose band and does not render an image.",
    type: "image",
    page: "about",
    group: "about.supplier",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

/// NEW group — "Our Label", hideable. Purely factual: the wreath and verse are
/// literally printed on every pack. No new claims.
const aboutLabelData: TemplateField[] = [
  {
    key: "bamboo.about.label-heading",
    label: "Label Section Heading",
    description: "Heading for the Our Label section",
    type: "text",
    page: "about",
    group: "about.label",
    defaultValue: "Our Label",
    placeholder: "Our Label",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.about.label-body",
    label: "Label Section Body",
    description: "Factual description of what's printed on the label",
    type: "textarea",
    page: "about",
    group: "about.label",
    gridColumn: "col-span-full",
    placeholder:
      "Every pack carries our label — a script wordmark, a bamboo wreath...",
    defaultValue:
      "Every pack carries our label — a script wordmark, a bamboo wreath drawn around the words Bamboo Toilet Tissue, and Hebrews 11:1–6 set in the margin. It's printed on every 4-pack, and it's where every illustration on this site comes from.",
  },
  {
    key: "bamboo.about.label-image",
    label: "Label Photo",
    description:
      "Photo of the printed label. Leave blank to show the wreath mark instead.",
    type: "image",
    page: "about",
    group: "about.label",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const aboutNationwideData: TemplateField[] = [
  {
    key: "bamboo.about.nationwide-heading",
    label: "Nationwide Distribution Heading",
    description: "Heading for the reach band",
    type: "text",
    page: "about",
    group: "about.nationwide",
    gridColumn: "col-span-full",
    defaultValue: "From Detroit to Your Door",
    placeholder: "From Detroit to Your Door",
  },
  {
    key: "bamboo.about.nationwide-text",
    label: "Nationwide Distribution Text",
    description: "Intro text above the three reach stations",
    type: "textarea",
    page: "about",
    group: "about.nationwide",
    gridColumn: "col-span-full",
    placeholder: `Our commitment to exceptional service extends across...`,
    defaultValue: `Our commitment to exceptional service extends across the country. We proudly offer nationwide shipping, and our dedicated team ensures a seamless, satisfying experience for every order. Whether you have questions about our products or need help with a delivery, our responsive and knowledgeable representatives are here to help.`,
  },
  {
    key: "bamboo.about.nationwide-image",
    label: "Nationwide Distribution Image (unused)",
    description:
      "Kept for saved-data compatibility. The redesigned reach band uses fixed illustrated discs instead of a photo.",
    type: "image",
    page: "about",
    group: "about.nationwide",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.about.nationwide-facts-list",
    label: "Nationwide Distribution Facts List",
    description:
      "The three reach stations (title and description per item). Each renders under a fixed illustrated disc (truck / storefront / shield), in order.",
    type: "list",
    page: "about",
    group: "about.nationwide",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description:
          "Stored for compatibility; the station renders a fixed illustrated disc instead.",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Station heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text",
      },
    ],
    minItems: 0,
    maxItems: 3,
  },
];

const aboutCTAData: TemplateField[] = [
  {
    key: "bamboo.about.cta-heading",
    label: "CTA Heading",
    description: "CTA heading",
    type: "text",
    page: "about",
    group: "about.cta",
    placeholder: "Ready to Make the Switch?",
    defaultValue: "Ready to Make the Switch?",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.about.cta-text",
    label: "CTA Text",
    description: "CTA text",
    type: "textarea",
    page: "about",
    group: "about.cta",
    placeholder: "Join the families, businesses, and communities...",
    gridColumn: "col-span-full",
    defaultValue: `Join the families, businesses, and communities across the nation who trust Finally Results for their everyday essentials.`,
  },
  {
    key: "bamboo.about.cta-button-text",
    label: "CTA Button Text",
    description: "First button in the CTA section, typically for shopping",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Shop Our Products",
    placeholder: "Shop Our Products",
  },
  {
    key: "bamboo.about.cta-button-link",
    label: "CTA Button Link",
    description: "First button in the CTA section, typically for shopping",
    type: "url",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
  {
    key: "bamboo.about.cta-secondary-button-text",
    label: "CTA Secondary Button Text",
    description:
      "Second button in the CTA section, typically for getting in touch",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "bamboo.about.cta-secondary-button-link",
    label: "CTA Secondary Button Link",
    description:
      "Second button in the CTA section, typically for getting in touch",
    type: "url",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

// Visual order on the redesigned page: hero, mission, detroit, values,
// whyBamboo, supplier, label, nationwide, cta. (Field array order doesn't
// have to match render order, but keeping it aligned makes the file easier
// to scan against the page component.)
export const aboutBambooData = [
  ...aboutHeroData,
  ...aboutMissionData,
  ...aboutDetroitData,
  ...aboutValuesData,
  ...aboutWhyBambooData,
  ...aboutSupplierData,
  ...aboutLabelData,
  ...aboutNationwideData,
  ...aboutCTAData,
];

export const bambooAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "About Hero",
    description: "About page hero heading and intro",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Why We Started",
    description: "Founder story heading, photo, and paragraphs",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "about.detroit",
    title: "Rooted in Detroit",
    description: "Detroit roots section",
    icon: "🏙️",
    columns: 2,
  },
  {
    id: "about.values",
    title: "What We Stand For",
    description: "Leaf-bulleted values list beside the illustrated vignette",
    icon: "❤️",
    columns: 2,
  },
  {
    id: "about.whyBamboo",
    title: "Why Bamboo",
    description: "Why Bamboo section and bamboo facts",
    icon: "🎋",
    columns: 2,
  },
  {
    id: "about.supplier",
    title: "Supplier",
    description: "More Than a Supplier prose band (hideable)",
    icon: "🏪",
    columns: 2,
  },
  {
    id: "about.label",
    title: "Our Label",
    description: "The printed label — photo and factual description",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "about.nationwide",
    title: "Nationwide Distribution",
    description: "From Detroit to Your Door reach band",
    icon: "🗺️",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "About CTA",
    description: "About CTA section",
    icon: "💬",
    columns: 2,
  },
];

export const DEFAULT_BAMBOO_VALUES: GenericIconRow[] = [
  {
    icon: Leaf,
    title: "Sustainability First",
    description:
      "Every decision we make starts with the planet. From sourcing to packaging, we choose the path that leaves the smallest footprint.",
  },
  {
    icon: Heart,
    title: "Premium Quality",
    description:
      "We refuse to compromise. Our bamboo products match or exceed the softness and strength of traditional premium brands.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "We believe in the power of community. We are always here to help you find the perfect product for your needs.",
  },
];

export const DEFAULT_BAMBOO_NATIONWIDE_FACTS: GenericIconRow[] = [
  {
    icon: Truck,
    title: "Nationwide Shipping",
    description:
      "We deliver our premium products to doorsteps across the country, carefully packaged and always on time.",
  },
  {
    icon: Building2,
    title: "Homes & Businesses",
    description:
      "From your bathroom to bustling restaurants, hotels, schools, and local stores -- we have solutions for every setting.",
  },
  {
    icon: ShieldCheck,
    title: "Customer-First Service",
    description:
      "Our dedicated Detroit-based team provides responsive, knowledgeable support for every order and inquiry.",
  },
];

export const DEFAULT_BAMBOO_WHY_BAMBOO_FACTS: GenericIconRow[] = [
  {
    icon: Sprout,
    title: "Fast-Growing & Renewable",
    description:
      "Bamboo is one of the fastest-growing plants on Earth, growing back in 3 to 6 years from the same root once harvested — no replanting required.",
  },
  {
    icon: Leaf,
    title: "Eco-Friendly",
    description:
      "Because bamboo regrows from its existing root system, it causes far less damage and erosion to the ecosystem, and it sequesters large amounts of carbon.",
  },
  {
    icon: Feather,
    title: "Soft, Strong & Gentle",
    description:
      "Bamboo makes paper goods that are soft yet strong and gentle on the skin — a sustainable alternative to traditional toilet paper without compromise.",
  },
];
