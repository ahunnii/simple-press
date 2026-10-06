import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { umscHeroPhotoFields } from "../shared/umsc-hero-fields";

// Built-in example values, used when the owner hasn't configured any — her
// verbatim values from the current site (design.md "must-keep phrases").
const UMSC_ABOUT_VALUES_DEFAULT_ROWS = [
  {
    title: "Wellness & Relief",
    body: "Unique Monique prioritizes self-care by fostering a healthier and cleaner environment. Our products are specifically designed to soothe common respiratory issues, such as asthma and allergies, through the use of natural, pollution-free ingredients. Our triple-scented candles, wax melts, and laundry pods create soothing spaces that enhance both physical comfort and mental wellness.",
  },
  {
    title: "Eco-Conscious & Everyday",
    body: "Our commitment to sustainability ensures that our products benefit not only your health but also the environment. Unique Monique uses naturally sourced ingredients and sustainable packaging, allowing you to enjoy effective home-care solutions without environmental guilt. Our antibacterial laundry pods and bleach tablets are user-friendly and eco-friendly, offering busy families a cleaner, greener way to manage household needs without compromise.",
  },
  {
    title: "Community-Driven & Family-Focused",
    body: "As a proud Black woman-owned business, Unique Monique is deeply rooted in community support. Our product range caters to diverse needs — from calming candles for relaxation to convenient, chemical-free cleaning solutions that are gentle on your skin and safe for your airways. We promise quality you can trust for yourself and your family.",
  },
] satisfies Record<string, string>[];

// design.md "Per-page section concepts › About": hero (not hideable) → maker
// (not hideable) → mission (not hideable) → values (hideable, hairline
// columns — NOT icon cards) → community (hideable, gallery field) → cta
// (hideable). Copy transcribed verbatim from
// docs/templates/umsc/references/About _ UNIQUE MONIQUE.jpeg per the build
// brief.

// ─── Hero (about.hero) ─────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "umsc.about.hero-heading",
    label: "Heading",
    description: "The page title shown on the dark page-hero band.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "Handmade care, kept personal.",
  },
  {
    key: "umsc.about.hero-lede",
    label: "Intro text",
    description: "One sentence beneath the heading.",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Small-batch candles, soaps, and body care — made by hand, one pour at a time.",
  },
  {
    key: "umsc.about.hero-image",
    label: "Photo",
    description:
      "Optional photo for the band at the top of the page — your products or team work well. Leave blank for a plain dark band. Where it shows is set by Show the photo behind the heading.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.about.hero-image-alt",
    label: "Photo alt text",
    description:
      "Accessible description of the hero photo, for screen readers.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  ...umscHeroPhotoFields("about", "about.hero", { withImage: false }),
];

// ─── Your story (about.maker) ──────────────────────────────────────────────

const aboutMakerData: TemplateField[] = [
  {
    key: "umsc.about.maker-heading",
    label: "Heading",
    description: "Heading above your story.",
    type: "text",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-full",
    defaultValue: "Meet Monique",
  },
  {
    key: "umsc.about.maker-body-1",
    label: "Paragraph 1",
    description: "First paragraph of your story.",
    type: "textarea",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-full",
    defaultValue:
      "At Unique Monique, we believe that self-care should be simple and sustainable. What began as a passion project in 2020 has blossomed into a purpose-driven business, offering more than just candles. Our range of eco-friendly, handcrafted products — including candles, body oils, cleaning products, and more — are designed to support healthier living, while creating moments of calm and comfort in your home.",
  },
  {
    key: "umsc.about.maker-body-2",
    label: "Paragraph 2",
    description: "Second paragraph of your story.",
    type: "textarea",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-full",
    defaultValue:
      "Inspired by the healing power of nature, our products are made with only the finest natural ingredients, from our scented soy wax candles to our antibacterial laundry pods. With a focus on sustainability, we ensure that each product is both kind to the environment and your body.",
  },
  {
    key: "umsc.about.maker-body-3",
    label: "Paragraph 3",
    description: "Third paragraph of your story.",
    type: "textarea",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-full",
    defaultValue:
      "Community is at the heart of everything we do. As a Black woman-owned business, we are proud to serve diverse communities. Whether you're looking for a meaningful gift, a way to refresh your space, or eco-conscious solutions for your home, we're here to bring a little more light, relaxation, and ease to your day.",
  },
  {
    key: "umsc.about.maker-image",
    label: "Photo",
    description: "Portrait or market-table photo shown beside your story.",
    type: "image",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "umsc.about.maker-image-alt",
    label: "Photo alt text",
    description: "Accessible description of the photo, for screen readers.",
    type: "text",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.about.maker-primary-label",
    label: "Primary button text",
    description: "Text for the primary button beneath your story.",
    type: "text",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "Shop products",
  },
  {
    key: "umsc.about.maker-primary-url",
    label: "Primary button link",
    description: "Where the primary button goes, e.g. /shop.",
    type: "url",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "umsc.about.maker-secondary-label",
    label: "Secondary button text",
    description: "Text for the outlined button beneath your story.",
    type: "text",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "Ask about custom",
  },
  {
    key: "umsc.about.maker-secondary-url",
    label: "Secondary button link",
    description: "Where the outlined button goes, e.g. /contact?type=custom.",
    type: "url",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "/contact?type=custom",
  },
];

// ─── Mission (about.mission) ───────────────────────────────────────────────

const aboutMissionData: TemplateField[] = [
  {
    key: "umsc.about.mission-quote",
    label: "Mission statement",
    description:
      "Your mission sentence, shown as a large pull-quote on a light band.",
    type: "textarea",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    defaultValue:
      "At Unique Monique Scented Candles, our mission is to promote healthier lifestyles within our homes and environment through eco-friendly, high-quality home and self-care products.",
  },
];

// ─── Values (about.values, hideable) ───────────────────────────────────────

const aboutValuesData: TemplateField[] = [
  {
    key: "umsc.about.values-heading",
    label: "Heading",
    description: "Heading above the three value columns.",
    type: "text",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    defaultValue: "Our Values",
  },
  {
    key: "umsc.about.values",
    label: "Values",
    description:
      "Three columns describing what the business stands for.",
    type: "list",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "value",
    summaryKey: "title",
    defaultsWhenEmpty: true,
    defaultRows: UMSC_ABOUT_VALUES_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "title",
        label: "Name",
        type: "text",
        description: "Name of this value, e.g. Wellness & Relief.",
        placeholder: "e.g. Wellness & Relief",
      },
      {
        key: "body",
        label: "Description",
        type: "textarea",
        description: "One sentence describing this value.",
        placeholder: "Describe this value",
      },
    ],
  },
];

// ─── Community (about.community, hideable) ─────────────────────────────────

const aboutCommunityData: TemplateField[] = [
  {
    key: "umsc.about.community-heading",
    label: "Heading",
    description: "Heading above the community photo grid.",
    type: "text",
    page: "about",
    group: "about.community",
    gridColumn: "col-span-full",
    defaultValue: "Our Customers. Our Community.",
  },
  {
    key: "umsc.about.community-gallery",
    label: "Gallery",
    description:
      "Pick a gallery of market and customer photos. Galleries are created under Admin → Galleries; its layout, aspect ratio, captions, and lightbox settings are honored here. Leave unset to hide this section on your site.",
    type: "gallery",
    page: "about",
    group: "about.community",
    gridColumn: "col-span-full",
  },
];

// ─── Closing band (about.cta, hideable) ─────────────────────────────────────

const aboutCtaData: TemplateField[] = [
  {
    key: "umsc.about.cta-heading",
    label: "Heading",
    description: "Heading on the closing dark band.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to bring a little more calm home?",
  },
  {
    key: "umsc.about.cta-button-label",
    label: "Button text",
    description: "Text for the button.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Shop products",
  },
  {
    key: "umsc.about.cta-button-url",
    label: "Button link",
    description: "Where the button goes, e.g. /shop.",
    type: "url",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const umscAboutData: TemplateField[] = [
  ...aboutHeroData,
  ...aboutMakerData,
  ...aboutMissionData,
  ...aboutValuesData,
  ...aboutCommunityData,
  ...aboutCtaData,
];

export const umscAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "Hero",
    description:
      "Page-hero heading, intro text, and an optional photo — beside the heading or filling the band behind it",
    icon: "🕯️",
    columns: 2,
  },
  {
    id: "about.maker",
    title: "Your story",
    description:
      "Your story — heading, three paragraphs, photo, and two buttons",
    icon: "🤍",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Mission",
    description: "Your mission statement, shown as a pull-quote",
    icon: "✨",
    columns: 1,
  },
  {
    id: "about.values",
    title: "Values",
    description: "Heading and the three value columns",
    icon: "🌿",
    columns: 1,
  },
  {
    id: "about.community",
    title: "Our customers. Our community.",
    description:
      "Heading and the market/customer photo gallery (pick one from Admin → Galleries)",
    icon: "📷",
    columns: 1,
  },
  {
    id: "about.cta",
    title: "Closing band",
    description: "Closing dark band heading and shop button",
    icon: "🛍️",
    columns: 2,
  },
];

export const umscAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "Hero",
    description: "Page hero with heading, intro text, and optional photo",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.maker",
    page: "about",
    title: "Your story",
    description: "Your story split with a photo",
    groupIds: ["about.maker"],
    order: 1,
    hideable: false,
  },
  {
    id: "about.mission",
    page: "about",
    title: "Mission",
    description: "Mission statement pull-quote on a light band",
    groupIds: ["about.mission"],
    order: 2,
    hideable: false,
  },
  {
    id: "about.values",
    page: "about",
    title: "Values",
    description: "Three value columns",
    groupIds: ["about.values"],
    order: 3,
    hideable: true,
  },
  {
    id: "about.community",
    page: "about",
    title: "Our customers. Our community.",
    description: "Market/customer photo gallery on a light band",
    groupIds: ["about.community"],
    order: 4,
    hideable: true,
    links: [SECTION_LINKS.galleries],
  },
  {
    id: "about.cta",
    page: "about",
    title: "Closing band",
    description: "Closing band with a shop button",
    groupIds: ["about.cta"],
    order: 5,
    hideable: true,
  },
];

// ─── Derived storefront constants ──────────────────────────────────────────

export const UMSC_ABOUT_DEFAULT_VALUES = listRowsFromDefaults(
  UMSC_ABOUT_VALUES_DEFAULT_ROWS,
  "default-value",
);
