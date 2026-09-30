import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "vii.homepage.hero-video",
    label: "Background video",
    description:
      "Optional full-viewport video for the hero. Plays instead of the background photo when set. Use .mp4 or .webm.",
    type: "video",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.hero-image",
    label: "Background photo",
    description:
      "Full-viewport background photo for the hero, used when no video is set. Use a high-quality landscape photo.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.hero-overline",
    label: "Small label",
    description: "Small italic label shown above the hero text. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Awaken a new sense of spirit",
  },
  {
    key: "vii.homepage.hero-heading",
    label: "Hero text",
    description: "The main paragraph overlaid on the hero photo or video.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Considered skincare and restorative facials, made personal. A calm corner of Detroit devoted to your skin, your ritual, and the time you give yourself.",
  },
  {
    key: "vii.homepage.hero-cta-text",
    label: "Button text",
    description: "Text for the primary button in the hero. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
  },
  {
    key: "vii.homepage.hero-cta-link",
    label: "Button link",
    description:
      "Where the hero button sends visitors — e.g. your booking page.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Categories ───────────────────────────────────────────────────────────────

const homepageCategoriesData: TemplateField[] = [
  {
    key: "vii.homepage.categories-overline",
    label: "Small label",
    description: "Small label above the categories heading.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue: "What we offer",
  },
  {
    key: "vii.homepage.categories-heading",
    label: "Heading",
    description: "Heading shown above the category tiles.",
    type: "text",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-1",
    defaultValue: "Explore our services",
  },
  {
    key: "vii.homepage.categories-cards",
    label: "Category tiles",
    description:
      "Tiles linking to your services or shop. The whole section hides when this list is empty. Up to 6 tiles.",
    type: "list",
    page: "homepage",
    group: "homepage.categories",
    gridColumn: "col-span-full",
    itemLabel: "category",
    maxItems: 6,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        description: "Background photo for the tile.",
        placeholder: "Upload a photo for this category",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Name shown over the photo.",
        placeholder: "e.g. Facials",
      },
      {
        key: "link",
        label: "Link",
        type: "text",
        description: "Where the tile links to. Defaults to /shop when blank.",
        placeholder: "e.g. /shop or /facials",
        optional: true,
      },
    ],
  },
];

// ─── Video Feature ──────────────────────────────────────────────────────────

const homepageVideoData: TemplateField[] = [
  {
    key: "vii.homepage.video-overline",
    label: "Small label",
    description: "Small label above the video section heading.",
    type: "text",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "Our philosophy",
  },
  {
    key: "vii.homepage.video-heading",
    label: "Heading",
    description:
      "The plain part of the video section heading (e.g. 'Wellness, the').",
    type: "text",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "Wellness, the",
  },
  {
    key: "vii.homepage.video-heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "Detroit way",
  },
  {
    key: "vii.homepage.video-body",
    label: "Body text",
    description: "Short paragraph beside the video.",
    type: "textarea",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-full",
    defaultValue:
      "Step inside our studio and see how we blend clinical skincare with genuine warmth. Every treatment is tailored to you — because feeling good in your skin should never feel ordinary.",
  },
  {
    key: "vii.homepage.video-file",
    label: "Video",
    description:
      "Video that plays when the viewer presses play. The whole section hides when neither this nor the poster photo is set. Use .mp4 or .webm.",
    type: "video",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.video-poster",
    label: "Poster photo",
    description:
      "Photo shown before the video plays, and as a fallback when no video is set.",
    type: "image",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.video-cta-text",
    label: "Link text",
    description:
      "Optional link below the body text. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "About us",
  },
  {
    key: "vii.homepage.video-cta-link",
    label: "Link URL",
    description: "Where the link below the body text points to.",
    type: "url",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },
  {
    key: "vii.homepage.video-aspect",
    label: "Video shape",
    description:
      "Controls the shape of the video player. Type one of: 16:9 (landscape, default), 4:3, 1:1 (square), or 9:16 (portrait).",
    type: "text",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "16:9",
    placeholder: "16:9",
  },
];

// ─── Image Band ───────────────────────────────────────────────────────────────

const homepageBandData: TemplateField[] = [
  {
    key: "vii.homepage.band-image",
    label: "Photo",
    description:
      "Full-width photo break between the video and product sections. A thin divider shows in its place when left blank.",
    type: "image",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.band-heading",
    label: "Heading",
    description:
      "Optional heading centered over the photo. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.band-text",
    label: "Body text",
    description:
      "Optional sentence beneath the heading. Only shown when a photo is set, and only when this is filled in.",
    type: "textarea",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
  },
];

// ─── Product Rail ─────────────────────────────────────────────────────────────

const homepageProductRailData: TemplateField[] = [
  {
    key: "vii.homepage.product-rail-overline",
    label: "Small label",
    description: "Small label above the featured products heading.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "Some of our bestsellers",
  },
  {
    key: "vii.homepage.product-rail-heading",
    label: "Heading",
    description: "Heading above the featured products.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "Shop our favorites",
  },
  {
    key: "vii.homepage.product-rail-collection",
    label: "Collection",
    description:
      "Pick a collection to feature. Defaults to your latest products when left empty.",
    type: "collection",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.product-rail-cta-text",
    label: "Link text",
    description: "Text for the 'view all' link below the featured products.",
    type: "text",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "Shop All",
  },
  {
    key: "vii.homepage.product-rail-cta-link",
    label: "Link URL",
    description: "Where the 'view all' link points to.",
    type: "url",
    page: "homepage",
    group: "homepage.productRail",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Testimonial Quote ────────────────────────────────────────────────────────

const homepageTestimonialData: TemplateField[] = [
  {
    key: "vii.homepage.testimonial-image",
    label: "Background photo",
    description:
      "Optional photo blended behind the testimonial quote below.",
    type: "image",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-full",
  },
];

// ─── Brands We Carry ──────────────────────────────────────────────────────────

const homepageBrandsData: TemplateField[] = [
  {
    key: "vii.homepage.brands-overline",
    label: "Small label",
    description: "Small label above the brand logos.",
    type: "text",
    page: "homepage",
    group: "homepage.brands",
    gridColumn: "col-span-1",
    defaultValue: "Brands We Carry",
  },
  {
    key: "vii.homepage.brands-heading",
    label: "Heading",
    description:
      "Optional heading for this section. Leave blank to show only the logos.",
    type: "text",
    page: "homepage",
    group: "homepage.brands",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii.homepage.brands-logos",
    label: "Brand logos",
    description:
      "Logos of the brands you carry. The whole section hides when this list is empty. Up to 12 logos.",
    type: "list",
    page: "homepage",
    group: "homepage.brands",
    gridColumn: "col-span-full",
    itemLabel: "brand",
    maxItems: 12,
    itemSchema: [
      {
        key: "image",
        label: "Logo",
        type: "image",
        description: "Brand logo image.",
        placeholder: "Upload a brand logo",
      },
      {
        key: "name",
        label: "Brand name",
        type: "text",
        description: "Used as the logo's alt text.",
        placeholder: "e.g. your favorite skincare brand",
        optional: true,
      },
    ],
  },
];

// ─── Blog ───────────────────────────────────────────────────────────────────

const homepageBlogData: TemplateField[] = [
  {
    key: "vii.homepage.blog-heading",
    label: "Heading",
    description:
      "The plain part of the blog section heading (e.g. 'A playground of').",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "A playground of",
  },
  {
    key: "vii.homepage.blog-heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "wellbeing",
  },
  {
    key: "vii.homepage.blog-intro",
    label: "Intro text",
    description:
      "Short paragraph introducing your blog, shown beneath the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-full",
    defaultValue:
      "Stories, rituals, and inspiration from our studio. Explore our blog for skincare guidance and a look at life at Skinbar VII.",
  },
  {
    key: "vii.homepage.blog-cta-text",
    label: "Link text",
    description: "Text for the link to the full blog, below the post cards.",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "Read the blog",
  },
  {
    key: "vii.homepage.blog-cta-link",
    label: "Link URL",
    description: "Where the blog link points to.",
    type: "url",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "/blog",
  },
];

// ─── Contact CTA ──────────────────────────────────────────────────────────────

const homepageContactData: TemplateField[] = [
  {
    key: "vii.homepage.contact-image",
    label: "Background photo",
    description: "Photo behind this closing contact section.",
    type: "image",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.contact-heading",
    label: "Heading",
    description: "Large heading for this closing contact section.",
    type: "text",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
  },
  {
    key: "vii.homepage.contact-subheading",
    label: "Small label",
    description: "Smaller line below the heading.",
    type: "text",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    defaultValue: "Want to know more?",
  },
  {
    key: "vii.homepage.contact-body",
    label: "Body text",
    description: "Short paragraph inviting visitors to reach out.",
    type: "textarea",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-full",
    defaultValue:
      "Our team is here to help you find the right treatment for your skin. Reach out to learn more about our facials, services, and booking.",
  },
  {
    key: "vii.homepage.contact-cta-text",
    label: "Button text",
    description:
      "Text for the button in this section (e.g. 'Book Now'). Both this and the button link must be set for the button to appear.",
    type: "text",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
  },
  {
    key: "vii.homepage.contact-cta-link",
    label: "Button link",
    description:
      "Where the button sends visitors — e.g. your booking page or a scheduling tool.",
    type: "url",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    placeholder: "e.g. your booking page URL",
  },
  {
    key: "vii.homepage.contact-show-phone",
    label: "Show phone number",
    description:
      "Display your business phone number (from Settings) in this section. Turn off for booking-only sections.",
    type: "boolean",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "vii.homepage.contact-show-email",
    label: "Show email",
    description:
      "Display your business email (from Settings) in this section. Turn off for booking-only sections.",
    type: "boolean",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
];

// ─── Instagram ────────────────────────────────────────────────────────────────

const homepageInstagramData: TemplateField[] = [
  {
    key: "vii.homepage.instagram-cta-text",
    label: "Follow button text",
    description:
      "Text for the follow button shown alongside your Instagram handle.",
    type: "text",
    page: "homepage",
    group: "homepage.instagram",
    gridColumn: "col-span-1",
    defaultValue: "Follow on Instagram",
  },
  {
    key: "vii.homepage.instagram-gallery",
    label: "Photos",
    description: "Photos shown in the gallery strip at the bottom of the homepage.",
    type: "gallery",
    page: "homepage",
    group: "homepage.instagram",
    gridColumn: "col-span-full",
  },
];

// ─── Local roots ───────────────────────────────────────────────────────────────

const homepageDetroitData: TemplateField[] = [
  {
    key: "vii.homepage.detroit-overline",
    label: "Small label",
    description: "Small label above the heading below.",
    type: "text",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-1",
    defaultValue: "Rooted in the city",
  },
  {
    key: "vii.homepage.detroit-heading",
    label: "Heading",
    description:
      "The plain part of this section's heading. The whole section hides when this, the highlighted words, and the body text are all blank.",
    type: "text",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-1",
    defaultValue: "A Detroit",
  },
  {
    key: "vii.homepage.detroit-heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-1",
    defaultValue: "original.",
  },
  {
    key: "vii.homepage.detroit-body",
    label: "Body text",
    description: "Short paragraph about your local roots.",
    type: "textarea",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-full",
    defaultValue:
      "Born and based in Detroit, Skinbar VII brings clinical-grade facials and honest skincare to the heart of the city — a calm studio rooted in the community it serves.",
  },
  {
    key: "vii.homepage.detroit-image",
    label: "Photo",
    description:
      "A meaningful local photo — your storefront, the neighborhood, or the city. Shows your city name in its place when left blank. Portrait orientation works best.",
    type: "image",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.detroit-details",
    label: "Detail tags",
    description:
      "Short tags shown in a row beneath the body text (e.g. neighborhood, year established). Up to 4.",
    type: "list",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-full",
    itemLabel: "detail",
    maxItems: 4,
    itemSchema: [
      {
        key: "label",
        label: "Tag",
        type: "text",
        description: "Short text shown as one tag in the row.",
        placeholder: "e.g. your street name",
      },
    ],
  },
  {
    key: "vii.homepage.detroit-cta-text",
    label: "Link text",
    description:
      "Optional link beneath this section (e.g. 'Visit us'). Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-1",
    defaultValue: "Visit the studio",
  },
  {
    key: "vii.homepage.detroit-cta-link",
    label: "Link URL",
    description: "Where the link points to — e.g. a map or your contact page.",
    type: "url",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const viiHomepageData: TemplateField[] = [
  ...homepageHeroData,
  ...homepageCategoriesData,
  ...homepageVideoData,
  ...homepageBandData,
  // homepageStoryData — "Inside the Studio" section temporarily removed from homepage — kept for restore.
  ...homepageProductRailData,
  ...homepageTestimonialData,
  ...homepageBrandsData,
  ...homepageBlogData,
  ...homepageDetroitData,
  ...homepageContactData,
  ...homepageInstagramData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const viiHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "Full-viewport hero with a background photo or video, a small label, and a booking button",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "homepage.categories",
    title: "Categories",
    description: "Small label, heading, and tiles linking to your services or shop",
    icon: "🧴",
    columns: 2,
  },
  {
    id: "homepage.video",
    title: "Video",
    description:
      "Split section pairing a two-part heading and body text with a play-on-click video",
    icon: "🎬",
    columns: 2,
  },
  {
    id: "homepage.band",
    title: "Photo banner",
    description: "Optional full-width photo break between the video and product sections",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "homepage.productRail",
    title: "Featured products",
    description:
      "Featured product row — pick a collection or show your latest products",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "homepage.testimonial",
    title: "Testimonial",
    description:
      "Quote section with an optional background photo — shows a random approved testimonial from Admin → Testimonials",
    icon: "❝",
    columns: 2,
  },
  {
    id: "homepage.brands",
    title: "Brands we carry",
    description: "Small label, optional heading, and a row of brand logos",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "homepage.blog",
    title: "Blog preview",
    description:
      "Two-part heading, intro text, and a row of your latest published blog posts",
    icon: "📖",
    columns: 2,
  },
  {
    id: "homepage.detroit",
    title: "Local roots",
    description:
      "Split section pairing a local photo with roots copy, detail tags, and a link",
    icon: "🏙️",
    columns: 2,
  },
  {
    id: "homepage.contact",
    title: "Contact",
    description:
      "Closing section with heading, body text, phone, and email",
    icon: "📞",
    columns: 2,
  },
  {
    id: "homepage.instagram",
    title: "Instagram",
    description:
      "Photo strip and follow button displayed at the bottom of the homepage — the handle and link come from your Instagram link in Content → Branding",
    icon: "📸",
    columns: 1,
  },
];
