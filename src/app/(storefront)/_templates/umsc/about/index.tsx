import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

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
    label: "Hero Heading",
    description: "The page title shown on the black page-hero band.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "Handmade care, kept personal.",
  },
  {
    key: "umsc.about.hero-lede",
    label: "Hero Lede",
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
    label: "Hero Image",
    description:
      "Photo shown on the right of the page hero (desktop only) — her three-jar photo works well here. Leave blank to show the UM mark instead of a photo.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.about.hero-image-alt",
    label: "Hero Image Alt Text",
    description:
      "Accessible description of the hero photo, for screen readers.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
];

// ─── The maker (about.maker) ───────────────────────────────────────────────

const aboutMakerData: TemplateField[] = [
  {
    key: "umsc.about.maker-heading",
    label: "Maker Heading",
    description: "Heading above her story.",
    type: "text",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-full",
    defaultValue: "Meet Monique",
  },
  {
    key: "umsc.about.maker-body-1",
    label: "Story Paragraph 1",
    description: "First paragraph of her About story.",
    type: "textarea",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-full",
    defaultValue:
      "At Unique Monique, we believe that self-care should be simple and sustainable. What began as a passion project in 2020 has blossomed into a purpose-driven business, offering more than just candles. Our range of eco-friendly, handcrafted products — including candles, body oils, cleaning products, and more — are designed to support healthier living, while creating moments of calm and comfort in your home.",
  },
  {
    key: "umsc.about.maker-body-2",
    label: "Story Paragraph 2",
    description: "Second paragraph of her About story.",
    type: "textarea",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-full",
    defaultValue:
      "Inspired by the healing power of nature, our products are made with only the finest natural ingredients, from our scented soy wax candles to our antibacterial laundry pods. With a focus on sustainability, we ensure that each product is both kind to the environment and your body.",
  },
  {
    key: "umsc.about.maker-body-3",
    label: "Story Paragraph 3",
    description: "Third paragraph of her About story.",
    type: "textarea",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-full",
    defaultValue:
      "Community is at the heart of everything we do. As a Black woman-owned business, we are proud to serve diverse communities. Whether you're looking for a meaningful gift, a way to refresh your space, or eco-conscious solutions for your home, we're here to bring a little more light, relaxation, and ease to your day.",
  },
  {
    key: "umsc.about.maker-image",
    label: "Maker Photo",
    description: "Portrait or market-table photo shown beside her story.",
    type: "image",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "umsc.about.maker-image-alt",
    label: "Maker Photo Alt Text",
    description: "Accessible description of the photo, for screen readers.",
    type: "text",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "umsc.about.maker-primary-label",
    label: "Primary Button Text",
    description: "Text for the gold button beneath her story.",
    type: "text",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "Shop products",
  },
  {
    key: "umsc.about.maker-primary-url",
    label: "Primary Button Link",
    description: "URL the gold button points to.",
    type: "url",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "umsc.about.maker-secondary-label",
    label: "Secondary Button Text",
    description: "Text for the ghost button beneath her story.",
    type: "text",
    page: "about",
    group: "about.maker",
    gridColumn: "col-span-1",
    defaultValue: "Ask about custom",
  },
  {
    key: "umsc.about.maker-secondary-url",
    label: "Secondary Button Link",
    description: "URL the ghost button points to.",
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
    label: "Mission Statement",
    description:
      "Her mission sentence, shown as a large pull-quote on a cream band.",
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
    label: "Values Heading",
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
      "Three hairline-separated columns describing what the business stands for. Up to 4. Leave empty to use the built-in defaults.",
    type: "list",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "title",
        label: "Value Name",
        type: "text",
        placeholder: "e.g. Wellness & Relief",
      },
      {
        key: "body",
        label: "Value Description",
        type: "textarea",
        placeholder: "Describe this value",
      },
    ],
  },
];

// ─── Community (about.community, hideable) ─────────────────────────────────

const aboutCommunityData: TemplateField[] = [
  {
    key: "umsc.about.community-heading",
    label: "Community Heading",
    description: "Heading above the community photo grid.",
    type: "text",
    page: "about",
    group: "about.community",
    gridColumn: "col-span-full",
    defaultValue: "Our Customers. Our Community.",
  },
  {
    key: "umsc.about.community-gallery",
    label: "Community Gallery",
    description:
      "Pick a photo gallery of markets/customers to show here. Leave unset to hide this section.",
    type: "gallery",
    page: "about",
    group: "about.community",
    gridColumn: "col-span-full",
  },
];

// ─── CTA (about.cta, hideable) ──────────────────────────────────────────────

const aboutCtaData: TemplateField[] = [
  {
    key: "umsc.about.cta-heading",
    label: "CTA Heading",
    description: "Heading on the closing black band.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to bring a little more calm home?",
  },
  {
    key: "umsc.about.cta-button-label",
    label: "Button Text",
    description: "Text for the gold button.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Shop products",
  },
  {
    key: "umsc.about.cta-button-url",
    label: "Button Link",
    description: "URL the gold button points to.",
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
    title: "About Hero",
    description: "Page-hero heading, lede, and optional right-side photo",
    icon: "🕯️",
    columns: 2,
  },
  {
    id: "about.maker",
    title: "The Maker",
    description:
      "Her story — heading, three paragraphs, photo, and two buttons",
    icon: "🤍",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Mission",
    description: "Her mission statement, shown as a pull-quote",
    icon: "✨",
    columns: 1,
  },
  {
    id: "about.values",
    title: "Values",
    description: "Heading and the three hairline value columns",
    icon: "🌿",
    columns: 1,
  },
  {
    id: "about.community",
    title: "Our Customers. Our Community.",
    description: "Heading and the market/customer photo gallery",
    icon: "📷",
    columns: 1,
  },
  {
    id: "about.cta",
    title: "Closing CTA",
    description: "Closing black band heading and shop button",
    icon: "🛍️",
    columns: 2,
  },
];

export const umscAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "Hero",
    description: "Page hero with heading, lede, and optional photo",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.maker",
    page: "about",
    title: "The Maker",
    description: "Her story split with a photo",
    groupIds: ["about.maker"],
    order: 1,
    hideable: false,
  },
  {
    id: "about.mission",
    page: "about",
    title: "Mission",
    description: "Mission statement pull-quote on cream",
    groupIds: ["about.mission"],
    order: 2,
    hideable: false,
  },
  {
    id: "about.values",
    page: "about",
    title: "Values",
    description: "Three hairline-separated value columns",
    groupIds: ["about.values"],
    order: 3,
    hideable: true,
  },
  {
    id: "about.community",
    page: "about",
    title: "Our Customers. Our Community.",
    description: "Market/customer photo grid",
    groupIds: ["about.community"],
    order: 4,
    hideable: true,
  },
  {
    id: "about.cta",
    page: "about",
    title: "Closing CTA",
    description: "Closing black band with a shop button",
    groupIds: ["about.cta"],
    order: 5,
    hideable: true,
  },
];
