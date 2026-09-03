import {
  Building2,
  Droplets,
  Heart,
  Leaf,
  ShieldCheck,
  Sprout,
  TreePine,
  Truck,
  Users,
} from "lucide-react";

import type {
  GenericIconRow,
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";

///ABOUT PAGE
const aboutHeroData: TemplateField[] = [
  {
    key: "bamboo.about.hero-tagline",
    label: "About Hero Tagline",
    description: "Tagline for the about page, above the title.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Detroit's Foremost Stationery Store",
    placeholder: "Detroit's Foremost Stationery Store",
  },
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
    defaultValue: `We're a Detroit-based household paper products company built on a simple belief: the everyday essentials in your home should be better -- better for your family, better for the planet, and delivered with the care you deserve.`,
    placeholder: `We're a Detroit-based household paper products company...`,
  },
  {
    key: "bamboo.about.hero-image",
    label: "About Hero Image",
    description: "Image for the about page",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
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
    description: "Image for the Why We Started section",
    type: "image",
    page: "about",
    group: "about.mission",
    defaultValue: "/placeholder.svg",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.about.mission-paragraph",
    label: "Why We Started Text",
    description: "Text for the Why We Started section",
    type: "textarea",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    placeholder: `We started our business with a simple belief...`,
    defaultValue: `We started Finally Results LLC with a question that wouldn't go away: why do the most basic products in our homes have to be the most wasteful? Traditional toilet paper relies on virgin wood pulp from forests that take decades to regrow. We knew there had to be a better way.
  
  Bamboo was our answer. As one of the fastest-growing plants on Earth, it can be harvested repeatedly without replanting. It's naturally antibacterial, incredibly soft, and requires no pesticides. When we discovered how remarkable this material was, we built our entire company around it.
  
  Today, every product we make is 100% bamboo, tree-free, septic-safe, and hypoallergenic -- delivering superior absorbency in recycled, plastic-free packaging.`,
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
      "Cards for the Values section (icon, title, and description per item).",
    type: "list",
    page: "about",
    group: "about.values",
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

const aboutSupplierData: TemplateField[] = [
  {
    key: "bamboo.about.supplier-heading",
    label: "Supplier Heading",
    description: "Heading for the Supplier section",
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
    label: "Supplier Image",
    description: "Image for the Supplier section",
    type: "image",
    page: "about",
    group: "about.supplier",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
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
    placeholder: "Bamboo is nature's most remarkable renewable resource...",
    defaultValue:
      "Bamboo is nature's most remarkable renewable resource. Here is why we chose it as the foundation for everything we make.",
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

const aboutNationwideData: TemplateField[] = [
  {
    key: "bamboo.about.nationwide-heading",
    label: "Nationwide Distribution Heading",
    description: "Heading for the Nationwide Distribution section",
    type: "text",
    page: "about",
    group: "about.nationwide",
    gridColumn: "col-span-full",
    defaultValue: "Nationwide Reach, Personal Touch",
    placeholder: "Nationwide Reach, Personal Touch",
  },
  {
    key: "bamboo.about.nationwide-text",
    label: "Nationwide Distribution Text",
    description: "Text for the Nationwide Distribution section",
    type: "textarea",
    page: "about",
    group: "about.nationwide",
    gridColumn: "col-span-full",
    placeholder: `Our commitment to exceptional service extends across...`,
    defaultValue: `Our commitment to exceptional service extends across the country. We proudly offer nationwide shipping, and our dedicated team ensures a seamless, satisfying experience for every order. Whether you have questions about our products or need help with a delivery, our responsive and knowledgeable representatives are here to help.`,
  },
  {
    key: "bamboo.about.nationwide-image",
    label: "Nationwide Distribution Image",
    description: "Image for the Nationwide Distribution section",
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
      "Cards for the Nationwide Distribution section (icon, title, and description per item).",
    type: "list",
    page: "about",
    group: "about.nationwide",
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

export const aboutBambooData = [
  ...aboutHeroData,
  ...aboutMissionData,
  ...aboutValuesData,
  ...aboutSupplierData,
  ...aboutWhyBambooData,
  ...aboutNationwideData,
  ...aboutDetroitData,
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
    title: "Our Mission",
    description: "Mission section heading and paragraphs",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "about.values",
    title: "What We Stand For",
    description: "Values section with three value cards",
    icon: "❤️",
    columns: 2,
  },
  {
    id: "about.supplier",
    title: "Supplier",
    description: "Supplier section heading and text",
    icon: "🏪",
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
    id: "about.nationwide",
    title: "Nationwide Distribution",
    description: "Nationwide distribution section",
    icon: "🗺️",
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
    title: "Rapid Growth",
    description:
      "Bamboo grows up to 35 inches per day and reaches maturity in 3-5 years, compared to 20-50 years for hardwood trees.",
  },
  {
    icon: TreePine,
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
