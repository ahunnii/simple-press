import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "vii.homepage.hero-video",
    label: "Hero Background Video",
    description:
      "Optional full-viewport video for the hero. When set, plays instead of the background image. Use .mp4 or .webm.",
    type: "video",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.hero-image",
    label: "Hero Background Image",
    description:
      "Full-viewport background image for the hero. Used when no video is set. Use a high-quality landscape photo.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.hero-overline",
    label: "Hero Overline",
    description: "Small italic label above the main body copy.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Awaken a new sense of spirit",
  },
  {
    key: "vii.homepage.hero-heading",
    label: "Hero Body Copy",
    description:
      "The main paragraph text overlaid on the hero image or video.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Reconnect and reinvigorate your senses in a place of incredible natural beauty, with personalized wellness experiences, and award-winning hospitality.",
  },
  {
    key: "vii.homepage.hero-cta-text",
    label: "Hero CTA Button Text",
    description: "Text for the primary call-to-action button in the hero.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
  },
  {
    key: "vii.homepage.hero-cta-link",
    label: "Hero CTA Button Link",
    description: "URL the hero CTA button points to.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Wellbeing ────────────────────────────────────────────────────────────────

const homepageWellbeingData: TemplateField[] = [
  {
    key: "vii.homepage.wellbeing-heading",
    label: "Wellbeing Section Heading",
    description:
      "The plain part of the two-part wellbeing heading (e.g. 'A Playground of').",
    type: "text",
    page: "homepage",
    group: "homepage.wellbeing",
    gridColumn: "col-span-1",
    defaultValue: "A Playground of",
  },
  {
    key: "vii.homepage.wellbeing-heading-accent",
    label: "Wellbeing Heading Accent Word",
    description:
      "The italic copper accent word completing the heading (e.g. 'wellbeing').",
    type: "text",
    page: "homepage",
    group: "homepage.wellbeing",
    gridColumn: "col-span-1",
    defaultValue: "wellbeing",
  },
  {
    key: "vii.homepage.wellbeing-body",
    label: "Wellbeing Body Text",
    description: "Short paragraph describing the spa's wellness philosophy.",
    type: "textarea",
    page: "homepage",
    group: "homepage.wellbeing",
    gridColumn: "col-span-full",
    defaultValue:
      "CIVANA offers a full range of thousand award-winning Sonoran Desert. CIVANA offers a path to wellness. Healthful spa through inspiring fitness communities, daily fitness and inspiration. Connected wellness and recovery. World-class immersive guided wellness experiences and beyond. Comfortable accommodations. A world-class spa. Distinctive food and drink, intimate talks to news and exchange. In addition to lots.",
  },
  {
    key: "vii.homepage.wellbeing-awards",
    label: "Awards & Recognition",
    description:
      "Award logos with captions displayed below the wellbeing body text. Up to 4 items.",
    type: "list",
    page: "homepage",
    group: "homepage.wellbeing",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "image",
        label: "Award Image",
        type: "image",
        placeholder: "Upload award logo or badge",
      },
      {
        key: "caption",
        label: "Caption",
        type: "text",
        placeholder: "e.g. Top 10 Best Spa Resort",
      },
    ],
  },
];

// ─── Story / Dark Carousel ────────────────────────────────────────────────────

const homepageStoryData: TemplateField[] = [
  {
    key: "vii.homepage.story-heading",
    label: "Story Section Heading",
    description:
      "The plain part of the story section heading (e.g. 'What story will you').",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "What story will you",
  },
  {
    key: "vii.homepage.story-heading-accent",
    label: "Story Heading Accent Word",
    description:
      "The italic copper accent word completing the story heading (e.g. 'tell?').",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "tell?",
  },
  {
    key: "vii.homepage.story-intro",
    label: "Story Intro Text",
    description:
      "Short paragraph introducing the story section beneath the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Every living moment is a new chapter to author. Your story at Skinbar VII is filled with discovery, connection, and transformation. Come write something worth remembering.",
  },
  {
    key: "vii.homepage.story-cards",
    label: "Story Cards",
    description:
      "Image cards shown in the dark carousel. Each card needs an image and a title. Up to 6 cards.",
    type: "list",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        placeholder: "Upload a story card image",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "e.g. Learn to Let Go",
      },
    ],
  },
];

// ─── Journeys Grid ────────────────────────────────────────────────────────────

const homepageJourneysData: TemplateField[] = [
  {
    key: "vii.homepage.journeys-overline",
    label: "Journeys Overline",
    description: "Small caps label above the journeys heading (e.g. 'Personalized').",
    type: "text",
    page: "homepage",
    group: "homepage.journeys",
    gridColumn: "col-span-1",
    defaultValue: "Personalized",
  },
  {
    key: "vii.homepage.journeys-heading-accent",
    label: "Journeys Heading Accent Word",
    description:
      "The italic copper accent word for the journeys heading (e.g. 'journeys').",
    type: "text",
    page: "homepage",
    group: "homepage.journeys",
    gridColumn: "col-span-1",
    defaultValue: "journeys",
  },
  {
    key: "vii.homepage.journeys-intro",
    label: "Journeys Intro Text",
    description: "Short paragraph below the journeys heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.journeys",
    gridColumn: "col-span-full",
    defaultValue:
      "Meet Me Well. Get to know who you truly are. Whatever you seek, we have a path for you. Learn, grow, and thrive with us.",
  },
  {
    key: "vii.homepage.journeys-cards",
    label: "Journey Cards",
    description:
      "Grid of journey category cards. Each card needs an image and a title. Up to 4 cards.",
    type: "list",
    page: "homepage",
    group: "homepage.journeys",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        placeholder: "Upload a journey category image",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "e.g. Total Wellness",
      },
    ],
  },
];

// ─── Categories ───────────────────────────────────────────────────────────────

const homepageCategoriesData: TemplateField[] = [
  {
    key: "vii.homepage.categories-overline",
    label: "Categories Overline",
    description: "Small caps label above the categories heading.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue: "What we offer",
  },
  {
    key: "vii.homepage.categories-heading",
    label: "Categories Heading",
    description: "Section heading for the categories grid.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue: "Explore our services",
  },
  {
    key: "vii.homepage.categories-cards",
    label: "Category Cards",
    description:
      "Category tiles, each with an image, title, and link. Up to 6 cards.",
    type: "list",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        placeholder: "Upload a category image",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "e.g. Facials",
      },
      {
        key: "link",
        label: "Link",
        type: "text",
        placeholder: "e.g. /shop or /facials",
      },
    ],
  },
];

// ─── Product Rail ─────────────────────────────────────────────────────────────

const homepageProductRailData: TemplateField[] = [
  {
    key: "vii.homepage.product-rail-overline",
    label: "Product Rail Overline",
    description: "Small caps label above the product rail heading.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "Some of our bestsellers",
  },
  {
    key: "vii.homepage.product-rail-heading",
    label: "Product Rail Heading",
    description: "Section heading for the featured product rail.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "Shop our favorites",
  },
  {
    key: "vii.homepage.product-rail-collection",
    label: "Product Rail Collection",
    description:
      "Pick a collection to feature. Defaults to your latest products when left empty.",
    type: "collection",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.product-rail-cta-text",
    label: "Product Rail CTA Text",
    description: "Text for the 'view all' link below the product rail.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "Shop All",
  },
  {
    key: "vii.homepage.product-rail-cta-link",
    label: "Product Rail CTA Link",
    description: "URL for the product rail 'view all' link.",
    type: "url",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Brands We Carry ──────────────────────────────────────────────────────────

const homepageBrandsData: TemplateField[] = [
  {
    key: "vii.homepage.brands-overline",
    label: "Brands Overline",
    description: "Small caps label above the brands logos.",
    type: "text",
    page: "homepage",
    group: "homepage.brands",
    gridColumn: "col-span-1",
    defaultValue: "Brands We Carry",
  },
  {
    key: "vii.homepage.brands-heading",
    label: "Brands Heading",
    description:
      "Optional heading for the brands section. Leave blank to show only the logos.",
    type: "text",
    page: "homepage",
    group: "homepage.brands",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii.homepage.brands-logos",
    label: "Brand Logos",
    description:
      "Logos of the brands you carry, each with an optional link. Up to 12 items.",
    type: "list",
    page: "homepage",
    group: "homepage.brands",
    gridColumn: "col-span-full",
    maxItems: 12,
    itemSchema: [
      {
        key: "image",
        label: "Logo",
        type: "image",
        placeholder: "Upload a brand logo",
      },
      {
        key: "name",
        label: "Brand Name",
        type: "text",
        placeholder: "e.g. Dermalogica",
      },
      {
        key: "link",
        label: "Link (optional)",
        type: "text",
        placeholder: "e.g. https://dermalogica.com",
      },
    ],
  },
];

// ─── Image Band ───────────────────────────────────────────────────────────────

const homepageBandData: TemplateField[] = [
  {
    key: "vii.homepage.band-image",
    label: "Band Image",
    description:
      "Full-width editorial image displayed as a horizontal band between sections.",
    type: "image",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
  },
];

// ─── Testimonial Quote ────────────────────────────────────────────────────────

const homepageTestimonialData: TemplateField[] = [
  {
    key: "vii.homepage.quote-image",
    label: "Quote Background Image",
    description:
      "Background image for the testimonial quote section. Use a landscape or nature photo.",
    type: "image",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.quote-text",
    label: "Guest Quote",
    description:
      "The featured guest testimonial quote displayed in large italic type.",
    type: "textarea",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-full",
    defaultValue:
      "\"I have been to a lot of wellness resorts and spas in my lifetime. CIVANA was a cut above the rest. It was everything I've always wanted. Exceeded and so much more.\"",
  },
  {
    key: "vii.homepage.quote-author",
    label: "Quote Author",
    description: "Name or attribution for the guest quote.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-1",
    defaultValue: "A Guest",
  },
];

// ─── Explore ──────────────────────────────────────────────────────────────────

const homepageExploreData: TemplateField[] = [
  {
    key: "vii.homepage.explore-overline",
    label: "Explore Overline",
    description: "Small caps overline above the explore heading.",
    type: "text",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-1",
    defaultValue: "explore",
  },
  {
    key: "vii.homepage.explore-heading",
    label: "Explore Heading",
    description: "Plain heading text below the overline.",
    type: "text",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-1",
    defaultValue: "More of our resort",
  },
  {
    key: "vii.homepage.explore-image",
    label: "Explore Main Image",
    description: "Large image shown in the explore section gallery area.",
    type: "image",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.explore-tabs",
    label: "Explore Tabs",
    description:
      "Tab labels for the explore section (Spa, Culinary, Rooms, Grounds, etc.). Up to 6 tabs.",
    type: "list",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "label",
        label: "Tab Label",
        type: "text",
        placeholder: "e.g. Spa",
      },
    ],
  },
  {
    key: "vii.homepage.explore-gallery-link-text",
    label: "Gallery Link Text",
    description: "Text for the link to the full gallery.",
    type: "text",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-1",
    defaultValue: "View Gallery",
  },
  {
    key: "vii.homepage.explore-gallery-link",
    label: "Gallery Link URL",
    description: "URL the gallery link points to.",
    type: "url",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-1",
    defaultValue: "/gallery",
  },
  {
    key: "vii.homepage.explore-package-title",
    label: "Package Title",
    description: "Heading for the inclusive package card below the gallery.",
    type: "text",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-1",
    defaultValue: "Inclusive Package",
  },
  {
    key: "vii.homepage.explore-package-body",
    label: "Package Body",
    description: "Short description for the inclusive package offering.",
    type: "textarea",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-full",
    defaultValue:
      "Experience the best of Skinbar VII in one seamlessly curated package. Everything you need for total renewal — accommodations, spa treatments, dining, and guided experiences — included.",
  },
  {
    key: "vii.homepage.explore-package-image",
    label: "Package Image",
    description: "Image shown on the inclusive package card.",
    type: "image",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.explore-package-cta-text",
    label: "Package CTA Text",
    description: "Button text for the inclusive package.",
    type: "text",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-1",
    defaultValue: "Learn More",
  },
  {
    key: "vii.homepage.explore-package-cta-link",
    label: "Package CTA Link",
    description: "URL for the package CTA button.",
    type: "url",
    page: "homepage",
    group: "homepage.explore",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Contact CTA ──────────────────────────────────────────────────────────────

const homepageContactData: TemplateField[] = [
  {
    key: "vii.homepage.contact-image",
    label: "Contact Section Background Image",
    description: "Dark landscape image behind the contact CTA section.",
    type: "image",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.contact-heading",
    label: "Contact Heading",
    description: "Large heading for the contact CTA section.",
    type: "text",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
  },
  {
    key: "vii.homepage.contact-subheading",
    label: "Contact Subheading",
    description: "Smaller subheading below the contact heading.",
    type: "text",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    defaultValue: "Want to know more?",
  },
  {
    key: "vii.homepage.contact-body",
    label: "Contact Body Text",
    description: "Short paragraph with context or an invitation to reach out.",
    type: "textarea",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-full",
    defaultValue:
      "Our team is ready to help you plan your perfect wellness escape. Reach out to learn more about our services, packages, and availability.",
  },
  {
    key: "vii.homepage.contact-phone",
    label: "Phone Number",
    description: "Phone number displayed in the contact section.",
    type: "text",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    placeholder: "e.g. +1 (313) 555-0100",
  },
  {
    key: "vii.homepage.contact-email",
    label: "Contact Email",
    description: "Email address displayed in the contact section.",
    type: "text",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    placeholder: "e.g. hello@skinbarvii.com",
  },
];

// ─── Instagram ────────────────────────────────────────────────────────────────

const homepageInstagramData: TemplateField[] = [
  {
    key: "vii.homepage.instagram-handle",
    label: "Instagram Handle",
    description:
      "Your Instagram handle shown above the gallery strip (e.g. '@skinbarvii').",
    type: "text",
    page: "homepage",
    group: "homepage.instagram",
    gridColumn: "col-span-1",
    defaultValue: "@skinbarvii",
  },
  {
    key: "vii.homepage.instagram-gallery",
    label: "Instagram Gallery",
    description:
      "Photos shown in the Instagram-style gallery strip at the bottom of the homepage.",
    type: "gallery",
    page: "homepage",
    group: "homepage.instagram",
    gridColumn: "col-span-full",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const viiHomepageData: TemplateField[] = [
  ...homepageHeroData,
  ...homepageWellbeingData,
  ...homepageCategoriesData,
  ...homepageStoryData,
  ...homepageJourneysData,
  ...homepageProductRailData,
  ...homepageBandData,
  ...homepageTestimonialData,
  ...homepageExploreData,
  ...homepageBrandsData,
  ...homepageContactData,
  ...homepageInstagramData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const viiHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero Section",
    description:
      "Full-viewport hero with background image or video, overline copy, and booking CTA",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "homepage.wellbeing",
    title: "Wellbeing Section",
    description:
      "Two-part heading, body copy, and award logos showcasing the spa's accolades",
    icon: "✨",
    columns: 2,
  },
  {
    id: "homepage.categories",
    title: "Categories Grid",
    description:
      "Overline, heading, and category tiles linking to your services or shop",
    icon: "🧴",
    columns: 2,
  },
  {
    id: "homepage.productRail",
    title: "Product Rail",
    description:
      "Featured product rail — pick a collection or show your latest products",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "homepage.brands",
    title: "Brands We Carry",
    description: "Overline, optional heading, and a row of brand logos",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "homepage.story",
    title: "Story Carousel",
    description:
      "Dark editorial section with heading, intro, and scrollable story image cards",
    icon: "📖",
    columns: 2,
  },
  {
    id: "homepage.journeys",
    title: "Journeys Grid",
    description:
      "Personalized journeys category grid with overline, heading, intro, and image cards",
    icon: "🗺️",
    columns: 2,
  },
  {
    id: "homepage.band",
    title: "Image Band",
    description:
      "Full-width editorial image displayed as a horizontal band between sections",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "homepage.testimonial",
    title: "Guest Quote",
    description:
      "Featured testimonial quote overlaid on a background image",
    icon: "💬",
    columns: 1,
  },
  {
    id: "homepage.explore",
    title: "Explore Section",
    description:
      "Tabbed gallery of resort areas plus an inclusive package card",
    icon: "🏨",
    columns: 2,
  },
  {
    id: "homepage.contact",
    title: "Contact CTA",
    description:
      "Dark contact section with heading, body text, phone, and email",
    icon: "📞",
    columns: 2,
  },
  {
    id: "homepage.instagram",
    title: "Instagram Gallery",
    description:
      "Handle and photo strip displayed at the bottom of the homepage",
    icon: "📸",
    columns: 1,
  },
];
