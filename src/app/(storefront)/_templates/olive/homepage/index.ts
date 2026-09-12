import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Olive Mode — homepage fields, groups and curated sections.
 *
 * Nine sections, in render order: the hero swatch card, the category fan, two
 * mood tiles, the swatch grid of new arrivals, the sage cover band, the feed,
 * the press strip, one customer quote and the journal teaser. Group ids and
 * default copy come straight from docs/templates/olive/design.md § Homepage.
 *
 * Every user-visible string on the page is a default in this file. Lists have
 * no default rows (the platform has no mechanism for one), so each list-backed
 * section either falls back to real store data — the category fan reads your
 * published collections — or hides itself rather than inventing content.
 */

// ─── 1. Hero ──────────────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "olive.homepage.hero-image",
    label: "Hero Photograph",
    description:
      "The full-width photograph behind the hero, and the still frame for the hero video. Leave blank to show the sage cover panel instead.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.homepage.hero-video",
    label: "Hero Video",
    description:
      "Optional silent video for the hero. When set it plays instead of the photograph, muted and looping, with a pause control. Leave blank to use the photograph.",
    type: "video",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "olive.homepage.hero-heading",
    label: "Hero Heading",
    description:
      "The first line a shopper reads, on the white card over the photograph. This is the page's main heading.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "New arrivals, pressed and ready.",
  },
  {
    key: "olive.homepage.hero-body",
    label: "Hero Line",
    description: "One line under the hero heading. Keep it to a sentence.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "This week's pieces are hung, steamed and waiting on the rail.",
  },
  {
    key: "olive.homepage.hero-cta-label",
    label: "Hero Button Label",
    description: "Label of the hero's button.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop new",
  },
  {
    key: "olive.homepage.hero-cta-link",
    label: "Hero Button Link",
    description: "Where the hero button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── 2. Categories ────────────────────────────────────────────────────────────

const homepageCategoriesData: TemplateField[] = [
  {
    key: "olive.homepage.categories-heading",
    label: "Categories Heading",
    description: "Heading above the row of category cards.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-full",
    defaultValue: "Shop by mood",
  },
  {
    key: "olive.homepage.categories-cards",
    label: "Category Cards",
    description:
      "Up to four photographic cards, each with a label and a link. Leave the list empty and your published collections fill the row instead.",
    type: "list",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "image",
        label: "Photograph",
        type: "image",
        placeholder: "Upload a category photograph",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        placeholder: "e.g. Dresses",
      },
      {
        key: "link",
        label: "Link",
        type: "text",
        placeholder: "e.g. /collections/dresses",
      },
    ],
  },
];

// ─── 3. Mood tiles ────────────────────────────────────────────────────────────

const homepageMoodData: TemplateField[] = [
  {
    key: "olive.homepage.mood-one-image",
    label: "First Tile Photograph",
    description: "The left-hand photograph of the two big tiles.",
    type: "image",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.homepage.mood-one-label",
    label: "First Tile Label",
    description: "The label on the white card in the tile's bottom corner.",
    type: "text",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-1",
    defaultValue: "New this week",
  },
  {
    key: "olive.homepage.mood-one-link",
    label: "First Tile Link",
    description: "Where the first tile goes.",
    type: "url",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "olive.homepage.mood-two-image",
    label: "Second Tile Photograph",
    description: "The right-hand photograph of the two big tiles.",
    type: "image",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "olive.homepage.mood-two-label",
    label: "Second Tile Label",
    description: "The label on the white card in the tile's bottom corner.",
    type: "text",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-1",
    defaultValue: "Behind the label",
  },
  {
    key: "olive.homepage.mood-two-link",
    label: "Second Tile Link",
    description: "Where the second tile goes.",
    type: "url",
    page: "homepage",
    group: "homepage.mood",
    gridColumn: "col-span-1",
    defaultValue: "/blog",
  },
];

// ─── 4. Product rail ──────────────────────────────────────────────────────────

const homepageProductRailData: TemplateField[] = [
  {
    key: "olive.homepage.rail-heading",
    label: "New Arrivals Heading",
    description: "Heading above the grid of products.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "Just in",
  },
  {
    key: "olive.homepage.rail-collection",
    label: "Featured Collection",
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
    label: "Rail Link Label",
    description: "The text link beside the heading.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "See everything",
  },
  {
    key: "olive.homepage.rail-link",
    label: "Rail Link",
    description: "Where the text link beside the heading goes.",
    type: "url",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "olive.homepage.rail-empty-heading",
    label: "Empty Rail Heading",
    description: "Shown in place of the grid while the shop has no products.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-full",
    defaultValue: "Nothing on the rail yet.",
  },
  {
    key: "olive.homepage.rail-empty-body",
    label: "Empty Rail Line",
    description: "One line under the empty-rail heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-full",
    defaultValue: "New pieces land most weeks. Come back and see.",
  },
];

// ─── 5. Sage band ─────────────────────────────────────────────────────────────

const homepageBandData: TemplateField[] = [
  {
    key: "olive.homepage.band-heading",
    label: "Band Heading",
    description: "Heading on the sage band, in white type.",
    type: "text",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
    defaultValue: "Made for Detroit days.",
  },
  {
    key: "olive.homepage.band-body",
    label: "Band Line",
    description: "One line under the band heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
    defaultValue:
      "Layers that hold up to a cold morning and a warm room, in colours that go with what you already own.",
  },
  {
    key: "olive.homepage.band-cta-label",
    label: "Band Button Label",
    description: "Label of the band's button.",
    type: "text",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-1",
    defaultValue: "Our story",
  },
  {
    key: "olive.homepage.band-cta-link",
    label: "Band Button Link",
    description: "Where the band's button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },
  {
    key: "olive.homepage.band-image",
    label: "Band Photograph",
    description:
      "The photograph card on the right of the sage band. Leave blank to show the paper panel instead.",
    type: "image",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

// ─── 6. Feed ──────────────────────────────────────────────────────────────────

const homepageFeedData: TemplateField[] = [
  {
    key: "olive.homepage.feed-heading",
    label: "Feed Heading",
    description: "Heading above the six square photographs.",
    type: "text",
    page: "homepage",
    group: "homepage.feed",
    gridColumn: "col-span-full",
    defaultValue: "On the feed",
  },
  {
    key: "olive.homepage.feed-handle",
    label: "Social Handle",
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
    label: "Profile Link",
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
    label: "Feed Photographs",
    description:
      "Up to six square photographs. Leave the list empty to hide the whole section.",
    type: "list",
    page: "homepage",
    group: "homepage.feed",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "image",
        label: "Photograph",
        type: "image",
        placeholder: "Upload a square photograph",
      },
      {
        key: "caption",
        label: "Description",
        type: "text",
        placeholder: "What is in the photo, for screen readers",
      },
    ],
  },
];

// ─── 7. Press ─────────────────────────────────────────────────────────────────

const homepagePressData: TemplateField[] = [
  {
    key: "olive.homepage.press-heading",
    label: "Press Heading",
    description: "Heading above the row of logos.",
    type: "text",
    page: "homepage",
    group: "homepage.press",
    gridColumn: "col-span-full",
    defaultValue: "As seen in",
  },
  {
    key: "olive.homepage.press-logos",
    label: "Press Logos",
    description:
      "Up to six logos of publications that have covered you. This section stays hidden until you turn it on and add logos.",
    type: "list",
    page: "homepage",
    group: "homepage.press",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "image",
        label: "Logo",
        type: "image",
        placeholder: "Upload a logo",
      },
      {
        key: "name",
        label: "Publication",
        type: "text",
        placeholder: "The publication's name",
      },
    ],
  },
];

// ─── 8. Testimonial ───────────────────────────────────────────────────────────

const homepageTestimonialData: TemplateField[] = [
  {
    key: "olive.homepage.testimonial-link-label",
    label: "Testimonial Link Label",
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
    label: "Testimonial Link",
    description: "Where the link under the quote goes.",
    type: "url",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-1",
    defaultValue: "/testimonials",
  },
];

// ─── 9. Journal ───────────────────────────────────────────────────────────────

const homepageBlogData: TemplateField[] = [
  {
    key: "olive.homepage.blog-heading",
    label: "Journal Heading",
    description: "Heading above the three most recent posts.",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-full",
    defaultValue: "From the journal",
  },
  {
    key: "olive.homepage.blog-link-label",
    label: "Journal Link Label",
    description: "The text link beside the journal heading.",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "All stories",
  },
  {
    key: "olive.homepage.blog-link",
    label: "Journal Link",
    description: "Where the text link beside the journal heading goes.",
    type: "url",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "/blog",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const oliveHomepageData: TemplateField[] = [
  ...homepageHeroData,
  ...homepageCategoriesData,
  ...homepageMoodData,
  ...homepageProductRailData,
  ...homepageBandData,
  ...homepageFeedData,
  ...homepagePressData,
  ...homepageTestimonialData,
  ...homepageBlogData,
];

export const oliveHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "The full-width photograph or video, and the white swatch card over it",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "homepage.categories",
    title: "Category Cards",
    description:
      "Heading and up to four photographic cards — your collections fill the row when the list is empty",
    icon: "🗂️",
    columns: 2,
  },
  {
    id: "homepage.mood",
    title: "Two Big Tiles",
    description: "The pair of large photographs with labels on white cards",
    icon: "🖼️",
    columns: 2,
  },
  {
    id: "homepage.productRail",
    title: "New Arrivals",
    description:
      "Heading, link and the grid of products — your latest eight, or one collection",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "homepage.band",
    title: "Sage Band",
    description: "The full-width sage band with a photograph and a button",
    icon: "🟩",
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
    title: "Press Logos",
    description:
      "The scrolling row of publication logos — hidden until you turn it on",
    icon: "📰",
    columns: 1,
  },
  {
    id: "homepage.testimonial",
    title: "Customer Quote",
    description: "One approved review on a slate card, with a link to the rest",
    icon: "❝",
    columns: 2,
  },
  {
    id: "homepage.blog",
    title: "Journal",
    description: "Heading, link and the three most recent posts",
    icon: "📓",
    columns: 2,
  },
];

export const oliveHomepageSections: TemplateSection[] = [
  {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    description:
      "Full-width photograph or video with the white swatch card over it",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.categories",
    page: "homepage",
    title: "Category Cards",
    description: "Row of photographic category cards, dealt in like swatches",
    groupIds: ["homepage.categories"],
    order: 1,
    hideable: true,
  },
  {
    id: "homepage.mood",
    page: "homepage",
    title: "Two Big Tiles",
    description: "The pair of large photographs with labels on white cards",
    groupIds: ["homepage.mood"],
    order: 2,
    hideable: true,
  },
  {
    id: "homepage.productRail",
    page: "homepage",
    title: "New Arrivals",
    description: "The swatch grid of your latest products or one collection",
    groupIds: ["homepage.productRail"],
    order: 3,
    hideable: false,
  },
  {
    id: "homepage.band",
    page: "homepage",
    title: "Sage Band",
    description: "Full-width sage band with a photograph and a button",
    groupIds: ["homepage.band"],
    order: 4,
    hideable: true,
  },
  {
    id: "homepage.feed",
    page: "homepage",
    title: "Feed",
    description: "Six square photographs linking to your profile",
    groupIds: ["homepage.feed"],
    order: 5,
    hideable: true,
  },
  {
    id: "homepage.press",
    page: "homepage",
    title: "Press Logos",
    description: "Scrolling row of publication logos",
    groupIds: ["homepage.press"],
    order: 6,
    hideable: true,
    defaultHidden: true,
  },
  {
    id: "homepage.testimonial",
    page: "homepage",
    title: "Customer Quote",
    description: "One approved review as a large quote on a slate card",
    groupIds: ["homepage.testimonial"],
    order: 7,
    hideable: true,
  },
  {
    id: "homepage.blog",
    page: "homepage",
    title: "Journal",
    description: "The three most recent posts as white cards",
    groupIds: ["homepage.blog"],
    order: 8,
    hideable: true,
  },
];
