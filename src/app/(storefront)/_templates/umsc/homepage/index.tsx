import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// ─── Hero (homepage.hero) ──────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "umsc.homepage.hero-video",
    label: "Hero Video",
    description:
      "Optional full-viewport video for the hero. When set, autoplays muted/looped instead of the image. Use .mp4.",
    type: "video",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "umsc.homepage.hero-image",
    label: "Hero Image",
    description:
      "Full-viewport hero photo, used as the video poster and as the background when no video is set. Leave blank to show a black ground with a soft gold glow instead of a generic placeholder.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "umsc.homepage.hero-image-alt",
    label: "Hero Image Alt Text",
    description:
      "Accessible description of the hero photo, for screen readers.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "umsc.homepage.hero-headline",
    label: "Hero Headline",
    description: "The uppercase Marcellus headline overlaid on the hero media.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Handmade essentials for calm homes.",
  },
  {
    key: "umsc.homepage.hero-lede",
    label: "Hero Lede",
    description: "One sentence beneath the headline.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Small-batch soy candles, soaps, and body care, poured and packed by hand in Detroit.",
  },
  {
    key: "umsc.homepage.hero-primary-label",
    label: "Primary Button Text",
    description: "Text for the gold hero button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop candles",
  },
  {
    key: "umsc.homepage.hero-primary-url",
    label: "Primary Button Link",
    description: "URL the gold hero button points to.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/collections/candles",
  },
  {
    key: "umsc.homepage.hero-secondary-label",
    label: "Secondary Button Text",
    description: "Text for the ghost hero button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "All products",
  },
  {
    key: "umsc.homepage.hero-secondary-url",
    label: "Secondary Button Link",
    description: "URL the ghost hero button points to.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Featured shelf (homepage.featured) ────────────────────────────────────

const homepageFeaturedData: TemplateField[] = [
  {
    key: "umsc.homepage.featured-heading",
    label: "Featured Shelf Heading",
    description:
      "Accessible heading for the featured-products shelf. Not shown visually — the shelf reads as the hero's bottom edge — but announced to screen readers.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-full",
    defaultValue: "Featured products",
  },
  {
    key: "umsc.homepage.featured-collection",
    label: "Featured Shelf Collection",
    description:
      "Pick a collection to feature on the shelf. Leave empty to show your latest four published products.",
    type: "collection",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-full",
  },
  {
    key: "umsc.homepage.featured-empty-text",
    label: "Featured Shelf Empty Text",
    description:
      "Shown beneath four placeholder tiles when you have no products yet.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-full",
    defaultValue: "Products are on their way.",
  },
];

// ─── Shop by type (homepage.categories) ────────────────────────────────────

const homepageCategoriesData: TemplateField[] = [
  {
    key: "umsc.homepage.categories-heading",
    label: "Shop By Type Heading",
    description: "Heading above the four category doors.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue: "Candles, soaps, body care, home care.",
  },
  {
    key: "umsc.homepage.categories-lede",
    label: "Shop By Type Lede",
    description: "One sentence beneath the shop-by-type heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue:
      "Four clear doors into the catalog. Pick a type; the products carry the details.",
  },
  {
    key: "umsc.homepage.categories-doors",
    label: "Category Doors",
    description:
      "The four product-type doors, each with an image, title, one-line blurb, and link. Up to 4.",
    type: "list",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        placeholder: "Upload a photo",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "e.g. Candles",
      },
      {
        key: "blurb",
        label: "Blurb",
        type: "text",
        placeholder: "e.g. Soy candles and wax melts.",
      },
      {
        key: "link",
        label: "Link",
        type: "text",
        placeholder: "e.g. /collections/candles",
      },
    ],
  },
  {
    key: "umsc.homepage.categories-all-label",
    label: '"All Products" Link Text',
    description: "Text for the link beside the shop-by-type heading.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue: "All products",
  },
  {
    key: "umsc.homepage.categories-all-url",
    label: '"All Products" Link URL',
    description: "URL the link points to.",
    type: "url",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Story (homepage.story) ────────────────────────────────────────────────

const homepageStoryData: TemplateField[] = [
  {
    key: "umsc.homepage.story-image",
    label: "Story Photo",
    description:
      "Photo of Monique or her market table, shown beside the story copy.",
    type: "image",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "umsc.homepage.story-image-alt",
    label: "Story Photo Alt Text",
    description:
      "Accessible description of the story photo, for screen readers.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "Monique at a community event",
  },
  {
    key: "umsc.homepage.story-heading",
    label: "Story Heading",
    description: "Heading for the story band.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "A shop that still feels like Monique is running it.",
  },
  {
    key: "umsc.homepage.story-lede",
    label: "Story Lede",
    description: "First, bolder line of the story copy.",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "What began as a passion project in 2020 has blossomed into a purpose-driven business, offering more than just candles.",
  },
  {
    key: "umsc.homepage.story-paragraph",
    label: "Story Paragraph",
    description: "Second paragraph of the story copy.",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Inspired by the healing power of nature, our products are made with only the finest natural ingredients — from scented soy wax candles to antibacterial laundry pods — with a focus on sustainability that is kind to the environment and your body.",
  },
  {
    key: "umsc.homepage.story-cta-label",
    label: "Story Button Text",
    description: "Text for the gold button beneath the story copy.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "Our story",
  },
  {
    key: "umsc.homepage.story-cta-url",
    label: "Story Button Link",
    description: "URL the story button points to.",
    type: "url",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },
];

// ─── New this season (homepage.rail) ───────────────────────────────────────

const homepageRailData: TemplateField[] = [
  {
    key: "umsc.homepage.rail-heading",
    label: "Product Rail Heading",
    description: "Heading above the second product rail.",
    type: "text",
    page: "homepage",
    group: "homepage.rail",
    gridColumn: "col-span-1",
    defaultValue: "New this season.",
  },
  {
    key: "umsc.homepage.rail-cta-label",
    label: '"View All" Link Text',
    description: "Text for the link beside the product rail heading.",
    type: "text",
    page: "homepage",
    group: "homepage.rail",
    gridColumn: "col-span-1",
    defaultValue: "View all",
  },
  {
    key: "umsc.homepage.rail-cta-url",
    label: '"View All" Link URL',
    description: "URL the link points to.",
    type: "url",
    page: "homepage",
    group: "homepage.rail",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "umsc.homepage.rail-collection",
    label: "Product Rail Collection",
    description:
      "Pick a collection for this second rail. Leave empty to show more of your latest products.",
    type: "collection",
    page: "homepage",
    group: "homepage.rail",
    gridColumn: "col-span-full",
  },
  {
    key: "umsc.homepage.rail-empty-text",
    label: "Product Rail Empty Text",
    description:
      "Shown beneath four placeholder tiles when there are no more products to show.",
    type: "text",
    page: "homepage",
    group: "homepage.rail",
    gridColumn: "col-span-full",
    defaultValue: "More products are on their way.",
  },
];

// ─── Our customers. Our community. (homepage.reviews) ─────────────────────

const homepageReviewsData: TemplateField[] = [
  {
    key: "umsc.homepage.reviews-heading",
    label: "Reviews Heading",
    description: "Heading above the customer reviews.",
    type: "text",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue: "Our customers. Our community.",
  },
  {
    key: "umsc.homepage.reviews-lede",
    label: "Reviews Lede",
    description: "One sentence beneath the reviews heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue:
      "Real reviews from real orders, pulled from the store. Yours can be next.",
  },
  {
    key: "umsc.homepage.reviews-override-quote",
    label: "Featured Review Quote",
    description:
      "Optional quote to feature first, ahead of your latest approved reviews. Leave blank to show real reviews automatically.",
    type: "textarea",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "umsc.homepage.reviews-override-name",
    label: "Featured Review Customer Name",
    description: "Customer name shown with the featured quote above.",
    type: "text",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.homepage.reviews-empty-text",
    label: "Reviews Empty Text",
    description:
      "Shown beside the Google review link when there are no reviews yet.",
    type: "text",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue: "Reviews are on their way.",
  },
];

// ─── Custom band (homepage.custom) ─────────────────────────────────────────

const homepageCustomData: TemplateField[] = [
  {
    key: "umsc.homepage.custom-heading",
    label: "Custom Band Heading",
    description: "Heading for the custom-order band.",
    type: "text",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-full",
    defaultValue: "Custom scents, gifts, and favors.",
  },
  {
    key: "umsc.homepage.custom-lede",
    label: "Custom Band Lede",
    description: "One or two sentences beneath the custom band heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell us the occasion, the count, and the date. We'll reply within two business days.",
  },
  {
    key: "umsc.homepage.custom-cta-label",
    label: "Primary Button Text",
    description: "Text for the gold custom-order button.",
    type: "text",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-1",
    defaultValue: "Start a custom request",
  },
  {
    key: "umsc.homepage.custom-cta-url",
    label: "Primary Button Link",
    description: "URL the gold button points to.",
    type: "url",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-1",
    defaultValue: "/contact?type=custom",
  },
  {
    key: "umsc.homepage.custom-secondary-label",
    label: "Secondary Button Text",
    description: "Text for the ghost custom-band button.",
    type: "text",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-1",
    defaultValue: "Ask a question",
  },
  {
    key: "umsc.homepage.custom-secondary-url",
    label: "Secondary Button Link",
    description: "URL the ghost button points to.",
    type: "url",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "umsc.homepage.custom-list",
    label: "What To Include",
    description:
      "Short lines telling shoppers what to mention in a custom request. Up to 3.",
    type: "list",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-full",
    maxItems: 3,
    itemSchema: [
      {
        key: "text",
        label: "Line",
        type: "text",
        placeholder: "e.g. Bundles, favors, and corporate gifts",
      },
    ],
  },
];

// ─── Questions (homepage.faq) ──────────────────────────────────────────────

const homepageFaqData: TemplateField[] = [
  {
    key: "umsc.homepage.faq-heading",
    label: "Questions Heading",
    description: "Heading for the homepage FAQ teaser.",
    type: "text",
    page: "homepage",
    group: "homepage.faq",
    gridColumn: "col-span-1",
    defaultValue: "Good to know.",
  },
  {
    key: "umsc.homepage.faq-lede",
    label: "Questions Lede",
    description: "One sentence beneath the questions heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.faq",
    gridColumn: "col-span-1",
    defaultValue: "The short answers. The full list lives on the FAQ page.",
  },
  {
    key: "umsc.homepage.faq-all-label",
    label: '"All Questions" Link Text',
    description: "Text for the link to the full FAQ page.",
    type: "text",
    page: "homepage",
    group: "homepage.faq",
    gridColumn: "col-span-1",
    defaultValue: "All questions",
  },
  {
    key: "umsc.homepage.faq-all-url",
    label: '"All Questions" Link URL',
    description: "URL the link points to.",
    type: "url",
    page: "homepage",
    group: "homepage.faq",
    gridColumn: "col-span-1",
    defaultValue: "/faq",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const umscHomepageData: TemplateField[] = [
  ...homepageHeroData,
  ...homepageFeaturedData,
  ...homepageCategoriesData,
  ...homepageStoryData,
  ...homepageRailData,
  ...homepageReviewsData,
  ...homepageCustomData,
  ...homepageFaqData,
];

export const umscHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "Full-viewport hero — video or photo, headline, lede, and the two entry buttons",
    icon: "🕯️",
    columns: 2,
  },
  {
    id: "homepage.featured",
    title: "Featured Shelf",
    description: "The tight product shelf directly beneath the hero",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "homepage.categories",
    title: "Shop By Type",
    description: "Heading, lede, and the four category doors",
    icon: "🚪",
    columns: 2,
  },
  {
    id: "homepage.story",
    title: "Story",
    description: "Photo + story copy on the cream band",
    icon: "📖",
    columns: 2,
  },
  {
    id: "homepage.rail",
    title: "New This Season",
    description: "Second product rail with its own collection",
    icon: "🆕",
    columns: 2,
  },
  {
    id: "homepage.reviews",
    title: "Our Customers. Our Community.",
    description: "Latest approved reviews and the Google review link",
    icon: "⭐",
    columns: 2,
  },
  {
    id: "homepage.custom",
    title: "Custom Band",
    description: "Black custom-order band with the what-to-include list",
    icon: "🎁",
    columns: 2,
  },
  {
    id: "homepage.faq",
    title: "Questions",
    description: "Homepage FAQ teaser — first three published FAQ items",
    icon: "❓",
    columns: 2,
  },
];

export const umscHomepageSections: TemplateSection[] = [
  {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    description:
      "Full-viewport hero with video/image, headline, lede, and CTAs",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.featured",
    page: "homepage",
    title: "Featured Shelf",
    description: "Four products directly beneath the hero",
    groupIds: ["homepage.featured"],
    order: 1,
    hideable: true,
  },
  {
    id: "homepage.categories",
    page: "homepage",
    title: "Shop By Type",
    description: "Four category doors — Candles, Soaps, Body Care, Home Care",
    groupIds: ["homepage.categories"],
    order: 2,
    hideable: true,
  },
  {
    id: "homepage.story",
    page: "homepage",
    title: "Story",
    description: "Cream band with Monique's story and a link to About",
    groupIds: ["homepage.story"],
    order: 3,
    hideable: true,
  },
  {
    id: "homepage.rail",
    page: "homepage",
    title: "New This Season",
    description: "Second product rail",
    groupIds: ["homepage.rail"],
    order: 4,
    hideable: true,
  },
  {
    id: "homepage.reviews",
    page: "homepage",
    title: "Our Customers. Our Community.",
    description: "Latest approved reviews and the Google review link",
    groupIds: ["homepage.reviews"],
    order: 5,
    hideable: true,
  },
  {
    id: "homepage.custom",
    page: "homepage",
    title: "Custom Band",
    description: "Black band inviting custom orders",
    groupIds: ["homepage.custom"],
    order: 6,
    hideable: true,
  },
  {
    id: "homepage.faq",
    page: "homepage",
    title: "Questions",
    description: "First three FAQ items with a link to the full FAQ page",
    groupIds: ["homepage.faq"],
    order: 7,
    hideable: true,
  },
];
