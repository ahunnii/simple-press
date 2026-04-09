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
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

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

/// BLOG + TESTIMONIALS PAGES
const blogPageData: TemplateField[] = [
  {
    key: "bamboo.blog.listing-title",
    label: "Blog listing title",
    description: "Main heading on the blog index page",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "Stories & Insights",
  },
  {
    key: "bamboo.blog.listing-intro",
    label: "Blog listing intro",
    description: "Short intro below the blog listing title",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue:
      "Tips on sustainable living, product care, and what is new at the shop.",
  },
  {
    key: "bamboo.blog.listing-image",
    label: "Blog listing image",
    description: "Hero image beside the blog listing title",
    type: "image",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.blog.post-cta-heading",
    label: "Blog post — CTA heading",
    description: "Call-to-action box at the end of each blog post",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Bring bamboo home",
  },
  {
    key: "bamboo.blog.post-cta-body",
    label: "Blog post — CTA body",
    description: "Supporting text for the post footer CTA",
    type: "textarea",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-full",
    defaultValue:
      "Explore tree-free, thoughtfully made essentials — crafted for everyday comfort.",
  },
  {
    key: "bamboo.blog.post-cta-button-text",
    label: "Blog post — CTA button text",
    description: "Label for the primary button in the post footer CTA",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Shop now",
  },
  {
    key: "bamboo.blog.post-cta-button-link",
    label: "Blog post — CTA button link",
    description: "Destination URL for the post footer CTA button",
    type: "url",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

const testimonialsPageData: TemplateField[] = [
  {
    key: "bamboo.testimonials-page.heading",
    label: "Testimonials page heading",
    description: "Main heading on the /testimonials page",
    type: "text",
    page: "global",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "What Customers Say",
  },
  {
    key: "bamboo.testimonials-page.subheading",
    label: "Testimonials page subheading",
    description: "Supporting line under the heading",
    type: "textarea",
    page: "global",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Real feedback from people who chose bamboo for their home.",
  },
];

///CONTACT PAGE
const contactPageData: TemplateField[] = [
  {
    key: "bamboo.contact.header",
    label: "Contact Page Header",
    description: "Main heading for the contact page",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Get in Touch",
  },
  {
    key: "bamboo.contact.subheader",
    label: "Contact Page Subheader",
    description: "Subheader or intro below the heading",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    defaultValue:
      "Have a question, want to partner with us, or just want to say hello? We would love to hear from you.",
  },
  {
    key: "bamboo.contact.email",
    label: "Contact Email",
    description: "Email address displayed on contact page",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "hello@finallyresults.com",
  },
  {
    key: "bamboo.contact.location",
    label: "Contact Location",
    description: "Location text (e.g. city, state)",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Detroit, Michigan",
  },
  {
    key: "bamboo.contact.phone",
    label: "Contact Phone",
    description: "Phone number",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "(313) 555-0199",
  },
  {
    key: "bamboo.contact.hours",
    label: "Business Hours",
    description: "Business hours text",
    type: "text",
    page: "contact",
    group: "contact.info",
    defaultValue: "Mon - Fri, 9am - 5pm EST",
  },
];

const globalLocationData: TemplateField[] = [
  {
    key: "bamboo.global.location-address",
    label: "Global Location Address",
    description: "Address for the global location section (used for map link)",
    type: "text",
    page: "global",
    group: "global.location",
    gridColumn: "col-span-full",
    defaultValue: "18058, Detroit, MI 48234",
  },
  {
    key: "bamboo.global.location-map",
    label: "Global Location Map",
    description: "Map image for the global location section",
    type: "image",
    page: "global",
    group: "global.location",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.listing",
    title: "Blog — listing",
    description: "Blog index page hero (title, intro, image)",
    icon: "📝",
    columns: 2,
  },
  {
    id: "blog.post",
    title: "Blog — post footer",
    description: "Call-to-action shown at the end of every blog article",
    icon: "✨",
    columns: 2,
  },
  {
    id: "testimonials.page",
    title: "Testimonials page",
    description: "Heading and subheading for the testimonials page",
    icon: "💬",
    columns: 2,
  },
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact page header and contact details",
    icon: "📧",
    columns: 2,
  },
  {
    id: "global.location",
    title: "Global Location Section",
    description: "Global location section on the homepage",
    icon: "🗺️",
    columns: 2,
  },
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
    description: "Customer testimonials (name, location, quote)",
    icon: "💬",
    columns: 2,
  },
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

export const bambooData = {
  bamboo: [
    ...homepageHeroData,
    ...homepageFeaturedData,
    ...homepageAboutTeaserData,
    ...homepageSustainabilityData,
    ...homepageLocationData,
    ...aboutHeroData,
    ...aboutMissionData,
    ...aboutValuesData,
    ...aboutSupplierData,
    ...aboutWhyBambooData,
    ...aboutNationwideData,
    ...aboutDetroitData,
    ...aboutCTAData,
    ...contactPageData,
    ...blogPageData,
    ...testimonialsPageData,
    ...globalLocationData,
  ],
};

export const bambooFieldGroups = {
  bamboo: fieldGroups,
};

const _bambooFieldMap = new Map(
  bambooData.bamboo.map((field) => [field.key, field]),
);

export function resolveFields(customFields: unknown, keys: string[]): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _bambooFieldMap);
}

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
