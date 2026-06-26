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
    description: "The main paragraph text overlaid on the hero image or video.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Considered skincare and restorative facials, made personal. A calm corner of Detroit devoted to your skin, your ritual, and the time you give yourself.",
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

// ─── Video Feature ──────────────────────────────────────────────────────────

const homepageVideoData: TemplateField[] = [
  {
    key: "vii.homepage.video-overline",
    label: "Video Section Overline",
    description: "Small caps label above the video section heading.",
    type: "text",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "Our philosophy",
  },
  {
    key: "vii.homepage.video-heading",
    label: "Video Section Heading",
    description:
      "The plain part of the two-part video section heading (e.g. 'Wellness, the').",
    type: "text",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "Wellness, the",
  },
  {
    key: "vii.homepage.video-heading-accent",
    label: "Video Heading Accent Word",
    description:
      "The italic accent word completing the heading (e.g. 'Detroit way').",
    type: "text",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "Detroit way",
  },
  {
    key: "vii.homepage.video-body",
    label: "Video Section Body",
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
    label: "Feature Video",
    description:
      "Video that plays when the viewer presses play. Use .mp4 or .webm.",
    type: "video",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.video-poster",
    label: "Video Poster Image",
    description:
      "Image shown before the video plays (and as a fallback when no video is set).",
    type: "image",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.video-cta-text",
    label: "Video CTA Text",
    description: "Optional link text below the video section body.",
    type: "text",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "About us",
  },
  {
    key: "vii.homepage.video-cta-link",
    label: "Video CTA Link",
    description: "URL the video section link points to.",
    type: "url",
    page: "homepage",
    group: "homepage.video",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },
  {
    key: "vii.homepage.video-aspect",
    label: "Video Aspect Ratio",
    description:
      "Controls the shape of the video player. Allowed values: 16:9 (landscape, default), 4:3, 1:1 (square), 9:16 (vertical/portrait).",
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
    label: "Full-Width Band Image",
    description:
      "Optional full-bleed visual break between the video and story sections. Falls back to a thin navy divider when left blank.",
    type: "image",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.band-heading",
    label: "Band Overlay Heading",
    description:
      "Optional serif heading centered over the band image. Leave blank to show the image without text.",
    type: "text",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.band-text",
    label: "Band Overlay Text",
    description:
      "Optional supporting sentence displayed beneath the band heading. Only shown when a band image is set.",
    type: "textarea",
    page: "homepage",
    group: "homepage.band",
    gridColumn: "col-span-full",
  },
];

// ─── Inside the Studio (Story) ─────────────────────────────────────────────
// "Inside the Studio" section temporarily removed from homepage — kept for restore.

const homepageStoryData: TemplateField[] = [
  {
    key: "vii.homepage.story-heading",
    label: "Studio Section Heading",
    description: "The plain part of the two-part studio section heading.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "Inside the",
  },
  {
    key: "vii.homepage.story-heading-accent",
    label: "Studio Heading Accent Word",
    description: "The italic copper accent word completing the studio heading.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "studio",
  },
  {
    key: "vii.homepage.story-intro",
    label: "Studio Intro Text",
    description: "Short calming line about the Detroit space.",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "A calm, considered space in the heart of Detroit — designed for focus, presence, and skin that glows.",
  },
  {
    key: "vii.homepage.story-cards",
    label: "Studio Photos",
    description: "Photos shown in the studio image carousel. Up to 6 cards.",
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
        placeholder: "Upload a studio photo",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "e.g. The treatment room",
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

// ─── Testimonial Quote ────────────────────────────────────────────────────────

const homepageTestimonialData: TemplateField[] = [
  {
    key: "vii.homepage.testimonial-image",
    label: "Testimonial Background Image",
    description:
      "Optional background image blended behind the testimonial quote.",
    type: "image",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.testimonial-quote",
    label: "Testimonial Quote (manual override)",
    description:
      "Leave blank to automatically show your most recent approved testimonial.",
    type: "textarea",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.testimonial-author",
    label: "Testimonial Author (manual override)",
    description:
      "Author name shown beneath the quote. Only used when a manual quote is set above.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonial",
    gridColumn: "col-span-1",
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
    ],
  },
];

// ─── Blog ───────────────────────────────────────────────────────────────────

const homepageBlogData: TemplateField[] = [
  {
    key: "vii.homepage.blog-heading",
    label: "Blog Section Heading",
    description:
      "The plain part of the two-part blog heading (e.g. 'A playground of').",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "A playground of",
  },
  {
    key: "vii.homepage.blog-heading-accent",
    label: "Blog Heading Accent Word",
    description:
      "The italic copper accent word completing the blog heading (e.g. 'wellbeing').",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "wellbeing",
  },
  {
    key: "vii.homepage.blog-intro",
    label: "Blog Intro Text",
    description:
      "Short paragraph introducing the blog section beneath the heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-full",
    defaultValue:
      "Stories, rituals, and inspiration from our studio. Explore our blog for skincare guidance and a look at life at Skinbar VII.",
  },
  {
    key: "vii.homepage.blog-cta-text",
    label: "Blog CTA Text",
    description: "Text for the link to the full blog below the post cards.",
    type: "text",
    page: "homepage",
    group: "homepage.blog",
    gridColumn: "col-span-1",
    defaultValue: "Read the blog",
  },
  {
    key: "vii.homepage.blog-cta-link",
    label: "Blog CTA Link",
    description: "URL for the blog 'read more' link.",
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
      "Our team is here to help you find the right treatment for your skin. Reach out to learn more about our facials, services, and booking.",
  },
  {
    key: "vii.homepage.contact-cta-text",
    label: "Button Label",
    description:
      "Text for the primary action button in the contact section (e.g. 'Book Now'). Both label and link must be set for the button to appear.",
    type: "text",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
  },
  {
    key: "vii.homepage.contact-cta-link",
    label: "Button Link",
    description:
      "URL the contact section button points to — e.g. your booking page or a scheduling tool.",
    type: "url",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    placeholder: "e.g. https://bookings.skinbarvii.com",
  },
  {
    key: "vii.homepage.contact-show-phone",
    label: "Show phone number in this section",
    description:
      "Display the business phone number in the contact CTA. Turn off for booking-only CTAs.",
    type: "boolean",
    page: "homepage",
    group: "homepage.contact",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "vii.homepage.contact-show-email",
    label: "Show email in this section",
    description:
      "Display the business email in the contact CTA. Turn off for booking-only CTAs.",
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
    key: "vii.homepage.instagram-cta-text",
    label: "Follow Button Label",
    description:
      "Text for the follow button displayed alongside the Instagram handle.",
    type: "text",
    page: "homepage",
    group: "homepage.instagram",
    gridColumn: "col-span-1",
    defaultValue: "Follow on Instagram",
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

// ─── Detroit / Location ───────────────────────────────────────────────────────

const homepageDetroitData: TemplateField[] = [
  {
    key: "vii.homepage.detroit-overline",
    label: "Detroit Overline",
    description: "Small label above the Detroit heading.",
    type: "text",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-1",
    defaultValue: "Rooted in the city",
  },
  {
    key: "vii.homepage.detroit-heading",
    label: "Detroit Heading",
    description: "The plain part of the two-part Detroit heading.",
    type: "text",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-1",
    defaultValue: "A Detroit",
  },
  {
    key: "vii.homepage.detroit-heading-accent",
    label: "Detroit Heading Accent",
    description: "The copper italic word completing the Detroit heading.",
    type: "text",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-1",
    defaultValue: "original.",
  },
  {
    key: "vii.homepage.detroit-body",
    label: "Detroit Body",
    description: "Short paragraph about the studio's Detroit roots.",
    type: "textarea",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-full",
    defaultValue:
      "Born and based in Detroit, Skinbar VII brings clinical-grade facials and honest skincare to the heart of the city — a calm studio rooted in the community it serves.",
  },
  {
    key: "vii.homepage.detroit-image",
    label: "Detroit Image",
    description:
      "A meaningful Detroit photo — your storefront, the neighborhood, or the city. Portrait orientation works best.",
    type: "image",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.homepage.detroit-details",
    label: "Detail Tags",
    description:
      "Short tags shown in a row beneath the body (e.g. neighborhood, year established). Up to 4.",
    type: "list",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      {
        key: "label",
        label: "Tag",
        type: "text",
        placeholder: "e.g. Livernois Avenue",
      },
    ],
  },
  {
    key: "vii.homepage.detroit-cta-text",
    label: "Detroit CTA Text",
    description: "Optional link beneath the Detroit section (e.g. 'Visit us').",
    type: "text",
    page: "homepage",
    group: "homepage.detroit",
    gridColumn: "col-span-1",
    defaultValue: "Visit the studio",
  },
  {
    key: "vii.homepage.detroit-cta-link",
    label: "Detroit CTA Link",
    description: "URL the Detroit CTA points to (e.g. a map or contact page).",
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
    title: "Hero Section",
    description:
      "Full-viewport hero with background image or video, overline copy, and booking CTA",
    icon: "🌿",
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
    id: "homepage.video",
    title: "Video Feature",
    description:
      "Split section pairing a two-part heading and body copy with a play-on-click video",
    icon: "🎬",
    columns: 2,
  },
  {
    id: "homepage.band",
    title: "Image Band",
    description:
      "Optional full-bleed visual break between the video and studio sections",
    icon: "🖼️",
    columns: 1,
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
    id: "homepage.testimonial",
    title: "Testimonial",
    description:
      "Slate quote section with an optional background image — auto-shows your latest approved review",
    icon: "❝",
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
    id: "homepage.blog",
    title: "Blog",
    description:
      "Two-part heading, intro, and a row of your latest published blog posts",
    icon: "📖",
    columns: 2,
  },
  {
    id: "homepage.detroit",
    title: "Detroit / Location",
    description:
      "Split brand-identity section pairing a Detroit photo with roots copy, detail tags, and a CTA",
    icon: "🏙️",
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
