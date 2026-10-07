import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import { SECTION_LINKS } from "~/lib/section-links";

/** "What to include" lines in the custom-order band. */
const UMSC_CUSTOM_LINES_DEFAULT_ROWS = [
  { text: "Candles, wax melts, soaps, or body care" },
  { text: "Bundles, favors, and corporate gifts" },
  { text: "Your scent notes, your colors, your label" },
] satisfies Record<string, string>[];

// ─── Hero (homepage.hero) ──────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "umsc.homepage.hero-video",
    label: "Video",
    description:
      "Optional full-viewport video for the hero. Plays muted and looped (there is no sound), with a pause button for visitors, and takes priority over the photo below when set. Also set the photo: it shows while the video loads, when it's paused, and for visitors who turn off motion. Leave blank to use the photo instead.",
    type: "video",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "umsc.homepage.hero-image",
    label: "Photo",
    description:
      "Full-viewport hero photo, used as the video poster and as the background when no video is set. Leave blank to show a dark backdrop with a soft glow instead of a plain placeholder.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "umsc.homepage.hero-image-alt",
    label: "Photo alt text",
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
    label: "Headline",
    description: "Headline shown over the hero photo or video.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Handmade essentials for calm homes.",
  },
  {
    key: "umsc.homepage.hero-lede",
    label: "Intro text",
    description: "One sentence below the headline.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Small-batch soy candles, soaps, and body care, poured and packed by hand in Detroit.",
  },
  {
    key: "umsc.homepage.hero-primary-label",
    label: "Primary button text",
    description: "Text on the main hero button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop candles",
  },
  {
    key: "umsc.homepage.hero-primary-url",
    label: "Primary button link",
    description: "Where the main hero button goes, e.g. /collections/candles.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/collections/candles",
  },
  {
    key: "umsc.homepage.hero-secondary-label",
    label: "Secondary button text",
    description: "Text for the outlined hero button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "All products",
  },
  {
    key: "umsc.homepage.hero-secondary-url",
    label: "Secondary button link",
    description: "Where the outlined hero button goes, e.g. /shop.",
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
    label: "Heading",
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
    label: "Collection",
    description:
      "Pick a collection to feature on the shelf. Leave empty to show your latest four published products.",
    type: "collection",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-full",
  },
  {
    key: "umsc.homepage.featured-empty-text",
    label: "Empty state text",
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
    label: "Heading",
    description:
      "Heading above the collection cards. The cards show your first four published collections, in the order set in Admin → Collections, each with that collection's image and description.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue: "Candles, soaps, body care, home care.",
  },
  {
    key: "umsc.homepage.categories-lede",
    label: "Intro text",
    description: "One sentence beneath the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue:
      "Four clear doors into the catalog. Pick a type; the products carry the details.",
  },
  {
    key: "umsc.homepage.categories-all-label",
    label: "Link text",
    description: "Text for the link beside the heading, e.g. All products.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue: "All products",
  },
  {
    key: "umsc.homepage.categories-all-url",
    label: "Link",
    description: "Where the link goes, e.g. /shop.",
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
    label: "Photo",
    description: "A photo of you or your team, shown beside the story copy.",
    type: "image",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "umsc.homepage.story-image-alt",
    label: "Photo alt text",
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
    label: "Heading",
    description: "Heading for the story section.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "A shop that still feels like Monique is running it.",
  },
  {
    key: "umsc.homepage.story-lede",
    label: "Intro text",
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
    label: "Body text",
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
    label: "Button text",
    description: "Text for the button beneath the story copy.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "Our story",
  },
  {
    key: "umsc.homepage.story-cta-url",
    label: "Button link",
    description: "Where the button goes, e.g. /about.",
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
    label: "Heading",
    description: "Heading above the second product rail.",
    type: "text",
    page: "homepage",
    group: "homepage.rail",
    gridColumn: "col-span-1",
    defaultValue: "New this season.",
  },
  {
    key: "umsc.homepage.rail-cta-label",
    label: "Link text",
    description: "Text for the link beside the heading, e.g. View all.",
    type: "text",
    page: "homepage",
    group: "homepage.rail",
    gridColumn: "col-span-1",
    defaultValue: "View all",
  },
  {
    key: "umsc.homepage.rail-cta-url",
    label: "Link",
    description: "Where the link goes, e.g. /shop.",
    type: "url",
    page: "homepage",
    group: "homepage.rail",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "umsc.homepage.rail-collection",
    label: "Collection",
    description:
      "Pick a collection for this second rail. Leave empty to show more of your latest products.",
    type: "collection",
    page: "homepage",
    group: "homepage.rail",
    gridColumn: "col-span-full",
  },
  {
    key: "umsc.homepage.rail-empty-text",
    label: "Empty state text",
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
    label: "Heading",
    description: "Heading above the customer reviews.",
    type: "text",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue: "Our customers. Our community.",
  },
  {
    key: "umsc.homepage.reviews-lede",
    label: "Intro text",
    description: "One sentence beneath the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue:
      "Real reviews from real orders, pulled from the store. Yours can be next.",
  },
  {
    key: "umsc.homepage.reviews-empty-text",
    label: "Empty state text",
    description:
      "Shown beside the Google review link when there are no reviews yet.",
    type: "text",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue: "Reviews are on their way.",
  },
  {
    key: "umsc.homepage.reviews-owner-source",
    label: "Owner label",
    description:
      "Small label on a review card whose testimonial was submitted by you, the business owner.",
    type: "text",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue: "From Monique",
  },
  {
    key: "umsc.homepage.reviews-verified-source",
    label: "Customer label",
    description:
      "Small label on a review card whose testimonial came from a customer order.",
    type: "text",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue: "Verified order",
  },
  {
    key: "umsc.homepage.reviews-anonymous-name",
    label: "Anonymous name",
    description: "Shown as the reviewer's name when a testimonial has none.",
    type: "text",
    page: "homepage",
    group: "homepage.reviews",
    gridColumn: "col-span-1",
    defaultValue: "A customer",
  },
];

// ─── Custom band (homepage.custom) ─────────────────────────────────────────

const homepageCustomData: TemplateField[] = [
  {
    key: "umsc.homepage.custom-heading",
    label: "Heading",
    description: "Heading for the custom-order section.",
    type: "text",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-full",
    defaultValue: "Custom scents, gifts, and favors.",
  },
  {
    key: "umsc.homepage.custom-lede",
    label: "Intro text",
    description: "One or two sentences beneath the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell us the occasion, the count, and the date. We'll reply within two business days.",
  },
  {
    key: "umsc.homepage.custom-cta-label",
    label: "Primary button text",
    description: "Text for the primary custom-order button.",
    type: "text",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-1",
    defaultValue: "Start a custom request",
  },
  {
    key: "umsc.homepage.custom-cta-url",
    label: "Primary button link",
    description: "Where the primary button goes, e.g. /contact?type=custom.",
    type: "url",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-1",
    defaultValue: "/contact?type=custom",
  },
  {
    key: "umsc.homepage.custom-secondary-label",
    label: "Secondary button text",
    description: "Text for the outlined button.",
    type: "text",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-1",
    defaultValue: "Ask a question",
  },
  {
    key: "umsc.homepage.custom-secondary-url",
    label: "Secondary button link",
    description: "Where the outlined button goes, e.g. /contact.",
    type: "url",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "umsc.homepage.custom-list",
    label: "What to include",
    description:
      "Short lines telling shoppers what to mention in a custom request.",
    type: "list",
    page: "homepage",
    group: "homepage.custom",
    gridColumn: "col-span-full",
    maxItems: 3,
    itemLabel: "line",
    summaryKey: "text",
    defaultsWhenEmpty: true,
    defaultRows: UMSC_CUSTOM_LINES_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "text",
        label: "Line",
        type: "text",
        description: "One short line, e.g. what kind of product or occasion.",
        placeholder: "e.g. Bundles, favors, and corporate gifts",
      },
    ],
  },
];

// ─── Questions (homepage.faq) ──────────────────────────────────────────────

const homepageFaqData: TemplateField[] = [
  {
    key: "umsc.homepage.faq-heading",
    label: "Heading",
    description:
      "Heading for the homepage questions. The section stays hidden until at least one question is published in Content → FAQ.",
    type: "text",
    page: "homepage",
    group: "homepage.faq",
    gridColumn: "col-span-1",
    defaultValue: "Good to know.",
  },
  {
    key: "umsc.homepage.faq-lede",
    label: "Intro text",
    description: "One sentence beneath the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.faq",
    gridColumn: "col-span-1",
    defaultValue: "The short answers. The full list lives on the FAQ page.",
  },
  {
    key: "umsc.homepage.faq-all-label",
    label: "Link text",
    description: "Text for the link to the full FAQ page.",
    type: "text",
    page: "homepage",
    group: "homepage.faq",
    gridColumn: "col-span-1",
    defaultValue: "All questions",
  },
  {
    key: "umsc.homepage.faq-all-url",
    label: "Link",
    description: "Where the link goes, e.g. /faq.",
    type: "url",
    page: "homepage",
    group: "homepage.faq",
    gridColumn: "col-span-1",
    defaultValue: "/faq",
  },
  {
    key: "umsc.homepage.faq-items",
    label: "Questions",
    description:
      "Pick up to three questions from Content → FAQ. Leave empty to show your first three published questions.",
    type: "faq",
    page: "homepage",
    group: "homepage.faq",
    gridColumn: "col-span-full",
    minItems: 0,
    maxItems: 3,
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
      "Full-viewport hero — video or photo, headline, intro text, and the two entry buttons",
    icon: "🕯️",
    columns: 2,
  },
  {
    id: "homepage.featured",
    title: "Featured shelf",
    description: "The tight product shelf directly beneath the hero",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "homepage.categories",
    title: "Shop by type",
    description:
      "Heading, intro text, and link. The cards show your first four published collections.",
    icon: "🚪",
    columns: 2,
  },
  {
    id: "homepage.story",
    title: "Story",
    description: "Photo and story copy on the light band",
    icon: "📖",
    columns: 2,
  },
  {
    id: "homepage.rail",
    title: "New this season",
    description: "Second product rail with its own collection",
    icon: "🆕",
    columns: 2,
  },
  {
    id: "homepage.reviews",
    title: "Our customers. Our community.",
    description: "Latest approved reviews and the Google review link",
    icon: "⭐",
    columns: 2,
  },
  {
    id: "homepage.custom",
    title: "Custom band",
    description: "Dark custom-order band with the what-to-include list",
    icon: "🎁",
    columns: 2,
  },
  {
    id: "homepage.faq",
    title: "Questions",
    description:
      "Up to three questions with a link to the full FAQ page. Stays hidden until at least one question is published in Content → FAQ",
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
      "Full-viewport hero with video/image, headline, intro text, and buttons",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.featured",
    page: "homepage",
    title: "Featured shelf",
    description: "Four products directly beneath the hero",
    groupIds: ["homepage.featured"],
    order: 1,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "homepage.categories",
    page: "homepage",
    title: "Shop by type",
    description:
      "Cards for your first four published collections, in the order set in Admin → Collections, each using that collection's image and description",
    groupIds: ["homepage.categories"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.collections],
  },
  {
    id: "homepage.story",
    page: "homepage",
    title: "Story",
    description: "Light band with your story and a link to About",
    groupIds: ["homepage.story"],
    order: 3,
    hideable: true,
  },
  {
    id: "homepage.rail",
    page: "homepage",
    title: "New this season",
    description: "Second product rail",
    groupIds: ["homepage.rail"],
    order: 4,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "homepage.reviews",
    page: "homepage",
    title: "Our customers. Our community.",
    description: "Latest approved reviews and the Google review link",
    groupIds: ["homepage.reviews"],
    order: 5,
    hideable: true,
    links: [SECTION_LINKS.testimonials],
  },
  {
    id: "homepage.custom",
    page: "homepage",
    title: "Custom band",
    description: "Dark band inviting custom orders",
    groupIds: ["homepage.custom"],
    order: 6,
    hideable: true,
  },
  {
    id: "homepage.faq",
    page: "homepage",
    title: "Questions",
    description:
      "Up to three questions with a link to the full FAQ page. Stays hidden until at least one question is published in Content → FAQ",
    groupIds: ["homepage.faq"],
    order: 7,
    hideable: true,
    links: [SECTION_LINKS.faq],
  },
];

// ─── Derived storefront constants ──────────────────────────────────────────

export const UMSC_CUSTOM_DEFAULT_LINES = listRowsFromDefaults(
  UMSC_CUSTOM_LINES_DEFAULT_ROWS,
  "default-line",
);
