import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Homepage: Intro Overlay ─────────────────────────────────────────────────

const homepageIntroData: TemplateField[] = [
  {
    key: "noise.homepage.intro-gallery",
    label: "Intro Overlay Gallery",
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
    label: "Hero Background Image",
    description:
      "Full-viewport background image for the hero section. Use a striking editorial fashion photo. Ignored when a hero video is set.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.homepage.hero-video",
    label: "Hero Background Video",
    description:
      "Optional video for the hero section. When set, plays instead of the background image. Use .mp4 or .webm, max 20 MB.",
    type: "video",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.homepage.hero-overline",
    label: "Hero Overline",
    description:
      "Small caps label above the main title (e.g. 'New Collection')",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "noise.homepage.hero-title",
    label: "Hero Title",
    description: "Large display headline",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Made with intention.",
  },
  {
    key: "noise.homepage.hero-tagline",
    label: "Hero Tagline",
    description: "Italic serif line below the title",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Fashion that dances. Garments that fly.",
  },
  {
    key: "noise.homepage.hero-primary-button-text",
    label: "Hero CTA Button Text",
    description: "Primary call-to-action button text",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop the Collection",
  },
  {
    key: "noise.homepage.hero-primary-button-link",
    label: "Hero CTA Button Link",
    description: "Primary CTA button URL",
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
    label: "Philosophy Overline",
    description: "Small caps label above the philosophy section",
    type: "text",
    page: "homepage",
    group: "homepage.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
  },
  {
    key: "noise.homepage.philosophy-quote",
    label: "Philosophy Quote",
    description: "Quote for the philosophy section",
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
    label: "Marquee Text",
    description:
      "Repeating text in the scrolling editorial band. Use · as separator.",
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
    key: "noise.homepage-about-image",
    label: "About Section Image",
    description: "Portrait/editorial image for the brand story teaser",
    type: "image",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.homepage-about-heading",
    label: "About Section Heading",
    description: "Large serif heading for the brand story teaser",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
    defaultValue: "The Art of Noise",
    placeholder: "The Art of Noise",
  },
  {
    key: "noise.homepage-about-body",
    label: "About Teaser Body",
    description: "Body text for the brand story teaser (richtext)",
    type: "richtext",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.homepage-about-button-text",
    label: "About Button Text",
    description: "Link text for the 'Our Story' button",
    type: "text",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-1",
    defaultValue: "Our Story",
  },
  {
    key: "noise.homepage-about-button-link",
    label: "About Button Link",
    description: "URL for the 'Our Story' button",
    type: "url",
    page: "homepage",
    group: "homepage.aboutTeaser",
    gridColumn: "col-span-1",
    defaultValue: "/about",
  },
];

// ─── Homepage: Featured Products ─────────────────────────────────────────────

const homepageFeaturedData: TemplateField[] = [
  {
    key: "noise.homepage-featured-title",
    label: "Featured Section Title",
    description: "Heading for the featured collection section",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-full",
    defaultValue: "The Collection",
  },
  {
    key: "noise.homepage-featured-description",
    label: "Featured Section Description",
    description: "Optional intro text below the section heading",
    type: "textarea",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-full",
    defaultValue: "Handcrafted with intention. Worn with purpose.",
  },
  {
    key: "noise.homepage-featured-button-text",
    label: "Featured Button Text",
    description: "CTA button text for the featured section",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "View All",
  },
  {
    key: "noise.homepage-featured-button-link",
    label: "Featured Button Link",
    description: "CTA button URL (ignored when a collection is selected — link auto-points to the collection page)",
    type: "url",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "noise.homepage.rail-one-collection",
    label: "Rail 1 — Collection",
    description: "Pick a collection for the first product rail. Defaults to featured products when unset.",
    type: "collection",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
  },
  {
    key: "noise.homepage.rail-one-overline",
    label: "Rail 1 — Overline",
    description: "Small caps label above the first product rail (e.g. 'Collection'). Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "Collection",
  },
  {
    key: "noise.homepage.rail-two-collection",
    label: "Rail 2 — Collection",
    description: "Pick a collection for the second product rail. Defaults to featured products when unset.",
    type: "collection",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
  },
  {
    key: "noise.homepage.rail-two-overline",
    label: "Rail 2 — Overline",
    description: "Small caps label above the second product rail (e.g. 'New Arrivals'). Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-1",
    defaultValue: "New Arrivals",
  },
  {
    key: "noise.homepage.rail-two-title",
    label: "Rail 2 — Title",
    description: "Section heading for the second product rail (used when no collection is selected).",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-full",
    defaultValue: "New Arrivals",
  },
];

// ─── Homepage: Testimonials ───────────────────────────────────────────────────

const homepageTestimonialsData: TemplateField[] = [
  {
    key: "noise.homepage-testimonials-heading",
    label: "Testimonials Heading",
    description: "Section heading for customer testimonials",
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
    key: "noise.homepage-guarantee-heading",
    label: "Guarantee Heading",
    description: "Heading for the guarantee section",
    type: "text",
    page: "homepage",
    group: "homepage.guarantee",
    gridColumn: "col-span-full",
    defaultValue: "Thoughtfully made.",
    placeholder: "Thoughtfully made.",
  },
  {
    key: "noise.homepage-guarantee-headingAccent",
    label: "Guarantee Heading Accent",
    description: "Accent text for the guarantee section heading",
    type: "text",
    page: "homepage",
    group: "homepage.guarantee",
    gridColumn: "col-span-1",
    defaultValue: "Responsibly backed.",
    placeholder: "Responsibly backed.",
  },
  {
    key: "noise.homepage-guarantee-quote",
    label: "Guarantee Quote",
    description: "Quote for the guarantee section",
    type: "textarea",
    page: "homepage",
    group: "homepage.guarantee",
    gridColumn: "col-span-full",
    defaultValue:
      "If a piece doesn't fit, doesn't last, or doesn't feel right — we'll make it right. Free returns within 60 days, and a lifetime repair program for every garment we make.",
  },
  {
    key: "noise.homepage-guarantee-stamp",
    label: "Guarantee Corner Stamp",
    description: "Short label shown on the image in the guarantee section. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.guarantee",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Handmade",
  },
];

export const noiseHomepageData = [
  ...homepageIntroData,
  ...homepageHeroData,
  ...homepageEditorialData,
  ...homepageGuaranteeData,
  ...homepageAboutTeaserData,
  ...homepageFeaturedData,
  ...homepagePhilosophyData,
  ...homepageTestimonialsData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.intro",
    title: "Intro Overlay",
    description: "Optional gallery to display as tiles in the intro animation",
    icon: "✦",
    columns: 1,
  },
  {
    id: "homepage.hero",
    title: "Hero Section",
    description: "Full-viewport hero with background image or video and headline",
    icon: "🎭",
    columns: 2,
  },
  {
    id: "homepage.philosophy",
    title: "Philosophy Section",
    description: "Philosophy section for the homepage",
    icon: "💡",
    columns: 1,
  },
  {
    id: "homepage.editorial",
    title: "Editorial Marquee Strip",
    description: "Scrolling tagline band beneath the hero",
    icon: "📜",
    columns: 1,
  },
  {
    id: "homepage.aboutTeaser",
    title: "Brand Story Teaser",
    description: "Portrait image + brand story excerpt section",
    icon: "✦",
    columns: 2,
  },
  {
    id: "homepage.featured",
    title: "Featured Collection",
    description: "Highlighted products on the homepage",
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
    title: "Guarantee Section",
    description: "Guarantee section for the homepage",
    icon: "🔒",
    columns: 1,
  },
];
