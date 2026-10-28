import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Olive Mode — homepage fields, groups and curated sections.
 *
 * Twelve sections, in render order (docs/templates/olive/design.md § Homepage
 * order, 2026-10-21): hero, new arrivals, The Edit band, shop by occasion,
 * the collection takeover, the About split, two photo tiles, one customer
 * quote, the feed, the press strip (hidden by default), the journal and the
 * Inner Circle sign-up. Default copy is the client's concept board.
 *
 * Every user-visible string on the page is a default in this file. List
 * sections either fall back to real store data — the occasion tiles read your
 * published collections — or hide themselves rather than inventing content.
 */

// ─── 1. Hero ──────────────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "olive.homepage.hero-images",
    label: "Photos",
    description:
      "Up to six full-width photographs behind the hero, shown one at a time with a slow cross-fade and numbered controls. The first is the one shoppers see on arrival, and the still frame for the hero video. One photograph stays put; none shows a plain dark panel instead.",
    type: "list",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemLabel: "photo",
    itemSchema: [
      {
        key: "image",
        label: "Photograph",
        type: "image",
        description: "One full-width hero photograph.",
        placeholder: "Upload a landscape photograph",
      },
    ],
  },
  {
    key: "olive.homepage.hero-video",
    label: "Video",
    description:
      "Optional silent video for the hero. When set it plays instead of the photographs, muted and looping, with a pause control. Leave blank to use the photographs.",
    type: "video",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "olive.homepage.hero-show-card",
    label: "Show headline and button",
    description:
      "On: the small line, heading, line and button are printed on the left of the photograph. Off: the photographs stand alone — the heading is still read out to screen readers, but nothing is drawn over the picture.",
    type: "boolean",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "true",
  },
  {
    key: "olive.homepage.hero-eyebrow",
    label: "Label above heading",
    description:
      "Small spaced capitals above the hero heading. Leave blank to hide it. Only shown when Show headline and button is on.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Distinctive style.",
    visibleWhen: { key: "olive.homepage.hero-show-card", equals: "true" },
  },
  {
    key: "olive.homepage.hero-heading",
    label: "Heading",
    description:
      "The first line a shopper reads, printed large on the left of the photograph. This is the page's main heading.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Effortless Confidence.",
  },
  {
    key: "olive.homepage.hero-body",
    label: "Line",
    description:
      "One line under the hero heading. Keep it to a sentence. Leave blank to hide it. Only shown when Show headline and button is on.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "A curated selection of modern pieces for the woman who moves with purpose.",
    visibleWhen: { key: "olive.homepage.hero-show-card", equals: "true" },
  },
  {
    key: "olive.homepage.hero-cta-label",
    label: "Button label",
    description:
      "Label of the hero's button. Leave blank to hide the button. Only shown when Show headline and button is on.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop new arrivals",
    visibleWhen: { key: "olive.homepage.hero-show-card", equals: "true" },
  },
  {
    key: "olive.homepage.hero-cta-link",
    label: "Button link",
    description:
      "Where the hero button goes. Only shown when Show headline and button is on.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    visibleWhen: { key: "olive.homepage.hero-show-card", equals: "true" },
  },
];

// ─── 4. Shop by occasion ──────────────────────────────────────────────────────

const homepageCategoriesData: TemplateField[] = [
  {
    key: "olive.homepage.categories-heading",
    label: "Heading",
    description:
      "Heading above the row of occasion tiles, set in spaced capitals.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-full",
    defaultValue: "Shop by occasion",
  },
  {
    key: "olive.homepage.categories-cards",
    label: "Tiles",
    description:
      "Up to four photographs, each with a caption underneath and a link (e.g. Everyday elevated, After hours). Leave the list empty and your published collections fill the row instead.",
    type: "list",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "tile",
    itemSchema: [
      {
        key: "image",
        label: "Photograph",
        type: "image",
        description:
          "Photo for this tile. Slightly wider than tall works best.",
        placeholder: "Upload a photograph",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        description: "The caption printed in spaced capitals under the photo.",
        placeholder: "e.g. After hours",
      },
      {
        key: "link",
        label: "Link",
        type: "text",
        description: "Where the tile goes.",
        placeholder: "e.g. /collections/after-hours",
      },
    ],
  },
];

// ─── 7. Photo tiles ───────────────────────────────────────────────────────────

const homepageMoodData: TemplateField[] = [
  {
    key: "olive.homepage.mood-one-image",
    label: "First tile photo",
    description: "The left-hand photograph of the two tiles.",
    type: "image",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.homepage.mood-one-label",
    label: "First tile label",
    description:
      "Printed on the bottom corner of the first photograph. Leave blank to hide the tile.",
    type: "text",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-1",
    defaultValue: "New this week",
  },
  {
    key: "olive.homepage.mood-one-link",
    label: "First tile link",
    description: "Where the first tile goes.",
    type: "url",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "olive.homepage.mood-two-image",
    label: "Second tile photo",
    description: "The right-hand photograph of the two tiles.",
    type: "image",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.homepage.mood-two-label",
    label: "Second tile label",
    description:
      "Printed on the bottom corner of the second photograph. Leave blank to hide the tile.",
    type: "text",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-1",
    defaultValue: "Behind the label",
  },
  {
    key: "olive.homepage.mood-two-link",
    label: "Second tile link",
    description: "Where the second tile goes.",
    type: "url",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-1",
    defaultValue: "/blog",
  },
];

// ─── 2. New arrivals ──────────────────────────────────────────────────────────

const homepageProductRailData: TemplateField[] = [
  {
    key: "olive.homepage.rail-heading",
    label: "Heading",
    description: "Heading above the row of products, set in spaced capitals.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "New arrivals",
  },
  {
    key: "olive.homepage.rail-collection",
    label: "Featured collection",
    description:
      "Show one collection here instead of your latest products. Leave empty for the eight most recent pieces.",
    type: "collection",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "olive.homepage.rail-link-label",
    label: "Link label",
    description:
      "The small link at the right end of the heading. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "Shop all",
  },
  {
    key: "olive.homepage.rail-link",
    label: "Link",
    description: "Where the text link beside the heading goes.",
    type: "url",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "olive.homepage.rail-empty-heading",
    label: "Empty state heading",
    description: "Shown in place of the grid while the shop has no products.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-full",
    defaultValue: "Nothing on the rail yet.",
  },
  {
    key: "olive.homepage.rail-empty-body",
    label: "Empty state body",
    description: "One line under the empty-state heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-full",
    defaultValue: "New pieces land most weeks. Come back and see.",
  },
];

// ─── 5. Collection takeover ───────────────────────────────────────────────────

const homepagePromoData: TemplateField[] = [
  {
    key: "olive.homepage.promo-takeover",
    label: "Full-photo takeover",
    description:
      "On: the photo fills the width of the page with the copy printed on its left. Off: a square photo beside the copy. Needs a photo to take effect — without one the copy sits on its own band.",
    type: "boolean",
    page: "homepage",
    group: "homepage.promo",
    gridColumn: "col-span-full",
    defaultValue: "true",
  },
  {
    key: "olive.homepage.promo-eyebrow",
    label: "Label above heading",
    description:
      "Small spaced capitals above the heading (e.g. The collection). Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.promo",
    gridColumn: "col-span-full",
    defaultValue: "The collection",
  },
  {
    key: "olive.homepage.promo-image",
    label: "Photo",
    description:
      "The photograph for the promo. Leave blank for a copy-only band.",
    type: "image",
    page: "homepage",
    group: "homepage.promo",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.homepage.promo-heading",
    label: "Heading",
    description:
      "Heading of the promo. Leave heading and text blank to hide the whole section.",
    type: "text",
    page: "homepage",
    group: "homepage.promo",
    gridColumn: "col-span-1",
    defaultValue: "Vacation Ready",
  },
  {
    key: "olive.homepage.promo-body",
    label: "Text",
    description: "A line or two under the promo heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.promo",
    gridColumn: "col-span-1",
    defaultValue:
      "Breezy silhouettes. Bold prints. Effortless style for wherever you're headed.",
  },
  {
    key: "olive.homepage.promo-button-label",
    label: "Button label",
    description: "Label of the promo button. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.promo",
    gridColumn: "col-span-1",
    defaultValue: "Shop the collection",
  },
  {
    key: "olive.homepage.promo-button-link",
    label: "Button link",
    description:
      "Where the promo button goes — usually one collection, but it can point anywhere (your rewards page, a sale).",
    type: "url",
    page: "homepage",
    group: "homepage.promo",
    gridColumn: "col-span-1",
    defaultValue: "/collections",
  },
];

// ─── 3. The Edit band ─────────────────────────────────────────────────────────

const homepageBandData: TemplateField[] = [
  {
    key: "olive.homepage.band-eyebrow",
    label: "Label above heading",
    description:
      "Small spaced capitals above the band heading (e.g. The edit). Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
    defaultValue: "The edit",
  },
  {
    key: "olive.homepage.band-heading",
    label: "Heading",
    description:
      "Heading on the coloured panel to the left of the band's photograph.",
    type: "text",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
    defaultValue: "Modern Pieces for a Well-Dressed Life.",
  },
  {
    key: "olive.homepage.band-body",
    label: "Body",
    description:
      "Optional line under the band heading. Leave blank to show the heading and button only.",
    type: "textarea",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "olive.homepage.band-cta-label",
    label: "Button label",
    description: "Label of the band's button. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-1",
    defaultValue: "Shop the collection",
  },
  {
    key: "olive.homepage.band-cta-link",
    label: "Button link",
    description: "Where the band's button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "olive.homepage.band-image",
    label: "Photo",
    description:
      "The large photograph to the right of the panel, running to the edge of the page. Leave blank and the panel spans the full width.",
    type: "image",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

// ─── 9. Feed ──────────────────────────────────────────────────────────────────

const homepageFeedData: TemplateField[] = [
  {
    key: "olive.homepage.feed-heading",
    label: "Heading",
    description:
      "Heading above the six square photographs, set in spaced capitals.",
    type: "text",
    page: "homepage",
    group: "homepage.feed",
    gridColumn: "col-span-full",
    defaultValue: "On the feed",
  },
  {
    key: "olive.homepage.feed-handle",
    label: "Handle",
    description:
      "Your handle, shown under the heading (e.g. @yourshop). Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.feed",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "@yourshop",
  },
  {
    key: "olive.homepage.feed-url",
    label: "Profile link",
    description:
      "Full URL of the profile the photographs link to. Leave blank and the photographs are shown without links.",
    type: "url",
    page: "homepage",
    group: "homepage.feed",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "olive.homepage.feed-images",
    label: "Photos",
    description:
      "Up to six square photographs. Leave the list empty to hide the whole section.",
    type: "list",
    page: "homepage",
    group: "homepage.feed",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemLabel: "photo",
    itemSchema: [
      {
        key: "image",
        label: "Photograph",
        type: "image",
        description: "One square photograph.",
        placeholder: "Upload a square photograph",
      },
      {
        key: "caption",
        label: "Description",
        type: "text",
        description:
          "What is in the photo, read out by screen readers. Leave blank for a decorative photo with no description.",
        placeholder: "What is in the photo, for screen readers",
        optional: true,
      },
    ],
  },
];

// ─── 10. Press ────────────────────────────────────────────────────────────────

const homepagePressData: TemplateField[] = [
  {
    key: "olive.homepage.press-heading",
    label: "Heading",
    description: "Heading above the row of logos, set in spaced capitals.",
    type: "text",
    page: "homepage",
    group: "homepage.press",
    gridColumn: "col-span-full",
    defaultValue: "As seen in",
  },
  {
    key: "olive.homepage.press-logos",
    label: "Logos",
    description:
      "Up to six logos of publications that have covered you. This section stays hidden until you turn it on and add logos.",
    type: "list",
    page: "homepage",
    group: "homepage.press",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemLabel: "logo",
    itemSchema: [
      {
        key: "image",
        label: "Logo",
        type: "image",
        description: "The publication's logo.",
        placeholder: "Upload a logo",
      },
      {
        key: "name",
        label: "Publication",
        type: "text",
        description:
          "The publication's name, read out by screen readers as the logo's description.",
        placeholder: "The publication's name",
        optional: true,
      },
    ],
  },
];

// ─── 8. Testimonial ───────────────────────────────────────────────────────────

const homepageTestimonialData: TemplateField[] = [
  {
    key: "olive.homepage.testimonial-link-label",
    label: "Link label",
    description:
      "Text link under the quote. Leave blank to show the quote on its own.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-1",
    defaultValue: "More kind words",
  },
  {
    key: "olive.homepage.testimonial-link",
    label: "Link",
    description: "Where the link under the quote goes.",
    type: "url",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-1",
    defaultValue: "/testimonials",
  },
];

// ─── 11. Journal ──────────────────────────────────────────────────────────────

const homepageBlogData: TemplateField[] = [
  {
    key: "olive.homepage.blog-heading",
    label: "Heading",
    description:
      "Heading above the three most recent posts, set in spaced capitals.",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-full",
    defaultValue: "From the journal",
  },
  {
    key: "olive.homepage.blog-link-label",
    label: "Link label",
    description: "The text link beside the journal heading.",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "All stories",
  },
  {
    key: "olive.homepage.blog-link",
    label: "Link",
    description: "Where the text link beside the journal heading goes.",
    type: "url",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "/blog",
  },
];

// ─── 6. About split ───────────────────────────────────────────────────────────

const homepageStoryData: TemplateField[] = [
  {
    key: "olive.homepage.story-eyebrow",
    label: "Label above heading",
    description:
      "Small spaced capitals above the heading (e.g. About your shop). Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "About Olive Mode",
  },
  {
    key: "olive.homepage.story-heading",
    label: "Heading",
    description:
      "Heading on the panel beside the photograph. Leave heading and text blank to hide the whole section.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "A Curated Boutique for the Modern Woman",
  },
  {
    key: "olive.homepage.story-body",
    label: "Text",
    description: "Two or three sentences about you, under the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "We strive to inspire the modern day woman to live lavishly through distinctive style, thoughtful curation, and pieces that make you feel like your best self — every day.",
  },
  {
    key: "olive.homepage.story-button-label",
    label: "Button label",
    description:
      "Label of the section's button. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "Our story",
  },
  {
    key: "olive.homepage.story-button-link",
    label: "Button link",
    description: "Where the button goes — your About page by default.",
    type: "url",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },
  {
    key: "olive.homepage.story-image",
    label: "Photo",
    description:
      "The photograph to the right of the panel. Leave blank and the copy sits centred on its own.",
    type: "image",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

// ─── 12. Inner Circle sign-up ─────────────────────────────────────────────────

const homepageNewsletterData: TemplateField[] = [
  {
    key: "olive.homepage.newsletter-eyebrow",
    label: "Label above heading",
    description:
      "Small spaced capitals above the sign-up heading. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.newsletter",
    gridColumn: "col-span-full",
    defaultValue: "The inner circle",
  },
  {
    key: "olive.homepage.newsletter-heading",
    label: "Heading",
    description:
      "Heading of the email sign-up at the bottom of the homepage. The section only appears while Email marketing is switched on for your store.",
    type: "text",
    page: "homepage",
    group: "homepage.newsletter",
    gridColumn: "col-span-full",
    defaultValue: "Be the First to Know",
  },
  {
    key: "olive.homepage.newsletter-body",
    label: "Text",
    description:
      "One line under the heading saying what subscribers get. Leave blank to hide it.",
    type: "textarea",
    page: "homepage",
    group: "homepage.newsletter",
    gridColumn: "col-span-full",
    defaultValue:
      "Join our community for new arrivals, exclusive offers, and style inspiration.",
  },
  {
    key: "olive.homepage.newsletter-button-label",
    label: "Button label",
    description:
      "What screen readers announce for the arrow button that sends the email address. It is not printed on the page.",
    type: "text",
    page: "homepage",
    group: "homepage.newsletter",
    gridColumn: "col-span-1",
    defaultValue: "Join",
  },
  {
    key: "olive.homepage.newsletter-image",
    label: "Background photo",
    description:
      "Optional photograph behind the sign-up, darkened on the left so the text stays readable. Leave blank for a plain dark band.",
    type: "image",
    page: "homepage",
    group: "homepage.newsletter",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

/** In render order, so the field panel reads top to bottom like the page. */
export const oliveHomepageData: TemplateField[] = [
  ...homepageHeroData,
  ...homepageProductRailData,
  ...homepageBandData,
  ...homepageCategoriesData,
  ...homepagePromoData,
  ...homepageStoryData,
  ...homepageMoodData,
  ...homepageTestimonialData,
  ...homepageFeedData,
  ...homepagePressData,
  ...homepageBlogData,
  ...homepageNewsletterData,
];

export const oliveHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "Up to six full-width photographs or a video, with the headline and button printed on the left",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "homepage.productRail",
    title: "New arrivals",
    description:
      "Heading, link and the row of products — your latest eight, or one collection",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "homepage.band",
    title: "The edit",
    description:
      "A coloured panel with a heading and button beside a large photograph",
    icon: "🟩",
    columns: 2,
  },
  {
    id: "homepage.categories",
    title: "Shop by occasion",
    description:
      "Heading and up to four photo tiles with captions — your collections fill the row when the list is empty",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "homepage.promo",
    title: "Collection takeover",
    description:
      "One collection told big: a full-width photograph with the copy printed on it, or a photo-and-text band",
    icon: "🎁",
    columns: 2,
  },
  {
    id: "homepage.story",
    title: "About split",
    description: "A few lines about you on a panel beside a photograph",
    icon: "📖",
    columns: 2,
  },
  {
    id: "homepage.mood",
    title: "Two photo tiles",
    description: "The pair of large photographs with labels printed on them",
    icon: "🖼️",
    columns: 2,
  },
  {
    id: "homepage.testimonial",
    title: "Customer quote",
    description:
      "One approved review set large as a quote, with a link to the rest",
    icon: "❝",
    columns: 2,
  },
  {
    id: "homepage.feed",
    title: "Feed",
    description: "Handle, profile link and six square photographs",
    icon: "📷",
    columns: 2,
  },
  {
    id: "homepage.press",
    title: "Press logos",
    description:
      "The scrolling row of publication logos — hidden until you turn it on",
    icon: "📰",
    columns: 1,
  },
  {
    id: "homepage.blog",
    title: "Journal",
    description: "Heading, link and the three most recent posts",
    icon: "📓",
    columns: 2,
  },
  {
    id: "homepage.newsletter",
    title: "Email sign-up",
    description:
      "The Inner Circle band at the bottom of the homepage — shown only while Email marketing is on",
    icon: "✉️",
    columns: 2,
  },
];

export const oliveHomepageSections: TemplateSection[] = [
  {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    description:
      "Full-width photographs or video with the headline and button printed on the left",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.productRail",
    page: "homepage",
    title: "New arrivals",
    description: "A row of your latest products or one collection",
    groupIds: ["homepage.productRail"],
    order: 1,
    hideable: false,
  },
  {
    id: "homepage.band",
    page: "homepage",
    title: "The edit",
    description:
      "Coloured panel with a heading and button beside a large photograph",
    groupIds: ["homepage.band"],
    order: 2,
    hideable: true,
  },
  {
    id: "homepage.categories",
    page: "homepage",
    title: "Shop by occasion",
    description: "Four photo tiles with captions underneath",
    groupIds: ["homepage.categories"],
    order: 3,
    hideable: true,
  },
  {
    id: "homepage.promo",
    page: "homepage",
    title: "Collection takeover",
    description:
      "Full-width photograph with copy printed on it, or a photo-and-text band",
    groupIds: ["homepage.promo"],
    order: 4,
    hideable: true,
  },
  {
    id: "homepage.story",
    page: "homepage",
    title: "About split",
    description: "A few lines about you beside a photograph",
    groupIds: ["homepage.story"],
    order: 5,
    hideable: true,
  },
  {
    id: "homepage.mood",
    page: "homepage",
    title: "Two photo tiles",
    description: "The pair of large photographs with labels printed on them",
    groupIds: ["homepage.mood"],
    order: 6,
    hideable: true,
  },
  {
    id: "homepage.testimonial",
    page: "homepage",
    title: "Customer quote",
    description: "One approved review set large as a quote",
    groupIds: ["homepage.testimonial"],
    order: 7,
    hideable: true,
  },
  {
    id: "homepage.feed",
    page: "homepage",
    title: "Feed",
    description: "Six square photographs linking to your profile",
    groupIds: ["homepage.feed"],
    order: 8,
    hideable: true,
  },
  {
    id: "homepage.press",
    page: "homepage",
    title: "Press logos",
    description: "Scrolling row of publication logos",
    groupIds: ["homepage.press"],
    order: 9,
    hideable: true,
    defaultHidden: true,
  },
  {
    id: "homepage.blog",
    page: "homepage",
    title: "Journal",
    description: "The three most recent posts",
    groupIds: ["homepage.blog"],
    order: 10,
    hideable: true,
  },
  {
    id: "homepage.newsletter",
    page: "homepage",
    title: "Email sign-up",
    description:
      "The Inner Circle email sign-up — appears only while Email marketing is on",
    groupIds: ["homepage.newsletter"],
    order: 11,
    hideable: true,
  },
];
