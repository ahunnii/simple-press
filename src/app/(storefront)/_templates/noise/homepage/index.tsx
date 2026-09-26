import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Homepage: Intro Overlay ─────────────────────────────────────────────────

const homepageIntroData: TemplateField[] = [
  {
    key: "noise.homepage.intro-gallery",
    label: "Gallery",
    description:
      "Gallery images shown as tiles in the intro animation. Leave unset to use the default color palette. Images are distributed evenly — a mix of photos and colors when you have fewer than 12.",
    type: "gallery",
    page: "homepage",
    group: "homepage.intro",
    gridColumn: "col-span-full",
  },
];

// ─── Homepage: Hero ───────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "noise.homepage.hero-image",
    label: "Background image",
    description:
      "Full-viewport background image for the hero section at the top of the homepage. Ignored when a background video is set.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.homepage.hero-video",
    label: "Background video",
    description:
      "Optional video for the hero section. When set, plays instead of the background image. Use .mp4 or .webm, max 20 MB.",
    type: "video",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.homepage.hero-overline",
    label: "Small label",
    description: "Small label above the main heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "noise.homepage.hero-title",
    label: "Heading",
    description: "Large heading in the hero section.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Made with intention.",
  },
  {
    key: "noise.homepage.hero-tagline",
    label: "Tagline",
    description: "Line below the heading in the hero section.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Fashion that dances. Garments that fly.",
  },
  {
    key: "noise.homepage.hero-primary-button-text",
    label: "Button text",
    description: "Text for the main button in the hero section.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop the Collection",
  },
  {
    key: "noise.homepage.hero-primary-button-link",
    label: "Button link",
    description: "Link for the main button in the hero section.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Homepage: Philosophy ─────────────────────────────────────────────────────

const homepagePhilosophyData: TemplateField[] = [
  {
    key: "noise.homepage.philosophy-overline",
    label: "Small label",
    description: "Small label above the philosophy quote.",
    type: "text",
    page: "homepage",
    group: "homepage.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
  },
  {
    key: "noise.homepage.philosophy-quote",
    label: "Quote",
    description: "Quote shown in the homepage philosophy section.",
    type: "textarea",
    page: "homepage",
    group: "homepage.philosophy",
    gridColumn: "col-span-full",
    defaultValue:
      "We design for presence, not attention.\nHonest fabrics, considered cuts, and a kind of quiet that holds up across seasons.",
  },
];

// ─── Homepage: Editorial Strip ────────────────────────────────────────────────

const homepageEditorialData: TemplateField[] = [
  {
    key: "noise.homepage.editorial-marquee-text",
    label: "Scrolling text",
    description:
      "Repeating text in the scrolling band beneath the hero. Separate phrases with ·.",
    type: "text",
    page: "homepage",
    group: "homepage.editorial",
    gridColumn: "col-span-full",
    defaultValue:
      "Fashion that dances · Garments that fly · Considered apparel · Small batches ·",
  },
];

// ─── Homepage: About Teaser ───────────────────────────────────────────────────

const homepageAboutTeaserData: TemplateField[] = [
  {
    key: "noise.homepage-about-overline",
    label: "Small label",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
    defaultValue: "Our Story",
  },
  {
    key: "noise.homepage-about-image",
    label: "Image",
    description: "Portrait image for the brand story section.",
    type: "image",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.homepage-about-heading",
    label: "Heading",
    description: "Heading for the brand story section.",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
    defaultValue: "The Art of Noise",
  },
  {
    key: "noise.homepage-about-body",
    label: "Story text",
    description: "Story text for the brand story section.",
    type: "richtext",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.homepage-about-button-text",
    label: "Button text",
    description: "Text for the button linking to the about page.",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-1",
    defaultValue: "Our Story",
  },
  {
    key: "noise.homepage-about-button-link",
    label: "Button link",
    description: "Link for the button linking to the about page.",
    type: "url",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },
];

// ─── Homepage: Collections Showcase ──────────────────────────────────────────
// Keys reused from the old first product rail (overline, featured-*) so any
// copy an owner already edited carries over to the showcase.

const homepageCollectionsData: TemplateField[] = [
  {
    key: "noise.homepage.rail-one-overline",
    label: "Small label",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.collections",
    gridColumn: "col-span-1",
    defaultValue: "Collections",
  },
  {
    key: "noise.homepage.collections-count",
    label: "Collections shown",
    description:
      "How many collections to show (2–6), in the order set on the Collections admin page. Collections with no published products are skipped.",
    type: "number",
    page: "homepage",
    group: "homepage.collections",
    gridColumn: "col-span-1",
    defaultValue: "3",
    placeholder: "3",
    min: 2,
    max: 6,
    step: 1,
  },
  {
    key: "noise.homepage-featured-title",
    label: "Heading",
    description: "Heading above the collections showcase. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.collections",
    gridColumn: "col-span-full",
    defaultValue: "The Collections",
  },
  {
    key: "noise.homepage-featured-description",
    label: "Intro text",
    description: "Optional text below the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.collections",
    gridColumn: "col-span-full",
    defaultValue: "Handcrafted with intention. Worn with purpose.",
  },
  {
    key: "noise.homepage-featured-button-text",
    label: "Button text",
    description:
      "Text for the button below the collections showcase. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.collections",
    gridColumn: "col-span-1",
    defaultValue: "View All Collections",
  },
  {
    key: "noise.homepage-featured-button-link",
    label: "Button link",
    description: "Link for the button below the collections showcase.",
    type: "url",
    page: "homepage",
    group: "homepage.collections",
    gridColumn: "col-span-1",
    defaultValue: "/collections",
  },
];

// ─── Homepage: Latest Arrivals ───────────────────────────────────────────────
// Group id stays `homepage.featured` (and the rail-two keys stay) so saved
// section visibility and copy carry over from the old second product rail.

const homepageFeaturedData: TemplateField[] = [
  {
    key: "noise.homepage.rail-two-overline",
    label: "Small label",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "New Arrivals",
  },
  {
    key: "noise.homepage.rail-two-title",
    label: "Heading",
    description:
      "Heading above your newest published products, newest first. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "Latest Arrivals",
  },
  {
    key: "noise.homepage.latest-button-text",
    label: "Button text",
    description:
      "Text for the button below the latest arrivals. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "Shop All",
  },
  {
    key: "noise.homepage.latest-button-link",
    label: "Button link",
    description: "Link for the button below the latest arrivals.",
    type: "url",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Homepage: Testimonials ───────────────────────────────────────────────────

const homepageTestimonialsData: TemplateField[] = [
  {
    key: "noise.homepage-testimonials-heading",
    label: "Heading",
    description:
      "Heading above the customer testimonial strip on the homepage. Also used as the heading at the top of the testimonials page.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "Worn & Beloved",
  },
];

// ─── Homepage: Guarantee ───────────────────────────────────────────────────────

const homepageGuaranteeData: TemplateField[] = [
  {
    key: "noise.homepage-guarantee-overline",
    label: "Small label",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.guarantee",
    gridColumn: "col-span-1",
    defaultValue: "Our Guarantee",
  },
  {
    key: "noise.homepage-guarantee-heading",
    label: "Heading",
    description: "Heading for the guarantee section.",
    type: "text",
    page: "homepage",
    group: "homepage.guarantee",
    gridColumn: "col-span-full",
    defaultValue: "Thoughtfully made.",
  },
  {
    key: "noise.homepage-guarantee-headingAccent",
    label: "Heading accent",
    description: "Accent text for the guarantee section heading.",
    type: "text",
    page: "homepage",
    group: "homepage.guarantee",
    gridColumn: "col-span-1",
    defaultValue: "Responsibly backed.",
  },
  {
    key: "noise.homepage-guarantee-quote",
    label: "Quote",
    description:
      "Quote below the heading in the guarantee section. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.guarantee",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "noise.homepage-guarantee-stamp",
    label: "Corner stamp",
    description:
      "Short label shown on the image in the guarantee section. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.guarantee",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Handmade",
  },
  {
    key: "noise.homepage-guarantee-image",
    label: "Image",
    description: "Image for the guarantee section.",
    type: "image",
    page: "homepage",
    group: "homepage.guarantee",
    defaultValue: "/placeholder.svg",
    gridColumn: "col-span-full",
  },
];

// ─── Homepage: Blog Teaser ─────────────────────────────────────────────────────
// Two-panel band linking to the blog. Only rendered while the Blog feature is
// on (same gate as before these fields existed).

const homepageBlogTeaserData: TemplateField[] = [
  {
    key: "noise.homepage.blog-teaser-overline",
    label: "Small label",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.blogTeaser",
    gridColumn: "col-span-1",
    defaultValue: "Blog",
  },
  {
    key: "noise.homepage.blog-teaser-heading",
    label: "Heading",
    description: "Heading in the blog section. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.blogTeaser",
    gridColumn: "col-span-1",
    defaultValue: "The latest and greatest from the shop.",
  },
  {
    key: "noise.homepage.blog-teaser-body",
    label: "Body text",
    description: "Short paragraph below the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.blogTeaser",
    gridColumn: "col-span-full",
    defaultValue:
      "Discover the latest arrivals, seasonal collections, and behind-the-scenes insights from the studio.",
    placeholder: "One or two sentences about what you write about.",
  },
  {
    key: "noise.homepage.blog-teaser-button-text",
    label: "Button text",
    description:
      "Text for the link to your blog. Leave blank to hide the link.",
    type: "text",
    page: "homepage",
    group: "homepage.blogTeaser",
    gridColumn: "col-span-1",
    defaultValue: "Read the blog",
  },
  {
    key: "noise.homepage.blog-teaser-button-link",
    label: "Button link",
    description: "Where the blog section link sends visitors.",
    type: "url",
    page: "homepage",
    group: "homepage.blogTeaser",
    gridColumn: "col-span-1",
    defaultValue: "/blog",
  },
  {
    key: "noise.homepage.blog-teaser-image",
    label: "Image",
    description:
      "Photo beside the blog text. Leave blank to show a striped panel with a large B instead.",
    type: "image",
    page: "homepage",
    group: "homepage.blogTeaser",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

export const noiseHomepageData = [
  ...homepageIntroData,
  ...homepageHeroData,
  ...homepageEditorialData,
  ...homepageGuaranteeData,
  ...homepageAboutTeaserData,
  ...homepageCollectionsData,
  ...homepageBlogTeaserData,
  ...homepageFeaturedData,
  ...homepagePhilosophyData,
  ...homepageTestimonialsData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.intro",
    title: "Intro animation",
    description: "Optional gallery to display as tiles in the intro animation",
    icon: "✦",
    columns: 1,
  },
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "Full-viewport hero with background image or video and headline",
    icon: "🎭",
    columns: 2,
  },
  {
    id: "homepage.philosophy",
    title: "Our philosophy",
    description: "Short brand philosophy quote shown on the homepage",
    icon: "💡",
    columns: 1,
  },
  {
    id: "homepage.editorial",
    title: "Scrolling text",
    description: "Scrolling text band beneath the hero",
    icon: "📜",
    columns: 1,
  },
  {
    id: "homepage.aboutTeaser",
    title: "Brand story",
    description:
      "Image, heading, and brand story excerpt shown on the homepage",
    icon: "✦",
    columns: 2,
  },
  {
    id: "homepage.collections",
    title: "Collections",
    description:
      "Your first few collections, in admin sort order, with cover images",
    icon: "🗂",
    columns: 2,
  },
  {
    id: "homepage.blogTeaser",
    title: "Blog",
    description:
      "Two-panel band linking to your blog, shown while the Blog feature is on",
    icon: "📰",
    columns: 2,
  },
  {
    id: "homepage.featured",
    title: "Latest arrivals",
    description: "Your newest published products, newest first",
    icon: "👗",
    columns: 2,
  },
  {
    id: "homepage.testimonials",
    title: "Testimonials",
    description: "Customer quote section",
    icon: "💬",
    columns: 1,
  },
  {
    id: "homepage.guarantee",
    title: "Guarantee",
    description: "Guarantee section for the homepage",
    icon: "🔒",
    columns: 1,
  },
];
