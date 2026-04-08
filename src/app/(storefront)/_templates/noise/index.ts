import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Homepage: Hero ───────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "noise.homepage.hero-image",
    label: "Hero Background Image",
    description:
      "Full-viewport background image for the hero section. Use a striking editorial fashion photo.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.homepage.hero-overline",
    label: "Hero Overline",
    description: "Small caps label above the main title (e.g. 'Visual Noise Detroit')",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Visual Noise Detroit",
  },
  {
    key: "noise.homepage.hero-title",
    label: "Hero Title",
    description: "Large display headline",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Visual Noise",
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

// ─── Homepage: Editorial Strip ────────────────────────────────────────────────

const homepageEditorialData: TemplateField[] = [
  {
    key: "noise.homepage.editorial-marquee-text",
    label: "Marquee Text",
    description: "Repeating text in the scrolling editorial band. Use · as separator.",
    type: "text",
    page: "homepage",
    group: "homepage.editorial",
    gridColumn: "col-span-full",
    defaultValue:
      "Fashion that dances · Garments that fly · Haute Couture · Detroit · Visual Noise ·",
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
    description: "CTA button URL",
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
    label: "Testimonials Heading",
    description: "Section heading for customer testimonials",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "Worn & Beloved",
  },
];

// ─── About Page ───────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "noise.about-hero-heading",
    label: "About Hero Heading",
    description: "Primary heading for the about page hero section",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "Visual Noise Detroit",
  },
  {
    key: "noise.about-hero-image",
    label: "About Hero Image",
    description: "Full-bleed background image for the about page hero",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.about-hero-mission",
    label: "Mission Statement",
    description: "Short mission statement shown in the hero section",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "Haute Couture, High Fashion, Elegantly Sewn, The creation of exclusivity.",
  },
  {
    key: "noise.about-hero-vision",
    label: "Vision Statement",
    description: "Short vision statement shown alongside the mission",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue:
      "...because fashion shouldn't be quiet.",
  },
];

const aboutStoryData: TemplateField[] = [
  {
    key: "noise.about-story-heading",
    label: "Story Section Heading",
    description: "Heading for the brand story section",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "...because fashion shouldn't be quiet",
  },
  {
    key: "noise.about-story-body",
    label: "Brand Story Body",
    description: "Full brand story content (richtext)",
    type: "richtext",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
  },
  {
    key: "noise.about-story-image-1",
    label: "Story Image 1",
    description: "First editorial image in the brand story section",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
  },
  {
    key: "noise.about-story-image-2",
    label: "Story Image 2",
    description: "Second editorial image in the brand story section",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
  },
];

const aboutCraftsmanshipData: TemplateField[] = [
  {
    key: "noise.about-craftsmanship-heading",
    label: "Craftsmanship Heading",
    description: "Heading for the craftsmanship/services section",
    type: "text",
    page: "about",
    group: "about.craftsmanship",
    gridColumn: "col-span-full",
    defaultValue: "Handcrafted Excellence",
  },
  {
    key: "noise.about-craftsmanship-banner",
    label: "Craftsmanship Banner Text",
    description: "Short pull quote or banner text for this section",
    type: "textarea",
    page: "about",
    group: "about.craftsmanship",
    gridColumn: "col-span-full",
    defaultValue: "Every garment is a statement. Every stitch, intentional.",
  },
  {
    key: "noise.about-craftsmanship-list",
    label: "Craftsmanship Features",
    description: "List of craftsmanship highlights (icon, title, description)",
    type: "list",
    page: "about",
    group: "about.craftsmanship",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      { key: "icon", label: "Icon", type: "icon", description: "Lucide icon name" },
      { key: "title", label: "Title", type: "text", placeholder: "e.g. Handcrafted Crochet" },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "e.g. Each piece crocheted by hand with premium yarn.",
      },
    ],
  },
];

const aboutCtaData: TemplateField[] = [
  {
    key: "noise.about-cta-heading",
    label: "About CTA Heading",
    description: "Heading for the about page call-to-action section",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Wear the Noise",
  },
  {
    key: "noise.about-cta-button-text",
    label: "About CTA Button Text",
    description: "Text for the CTA button",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
  },
  {
    key: "noise.about-cta-button-link",
    label: "About CTA Button Link",
    description: "URL for the CTA button",
    type: "url",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ─── Contact Page ─────────────────────────────────────────────────────────────

const contactPageData: TemplateField[] = [
  {
    key: "noise.contact.header",
    label: "Contact Page Header",
    description: "Heading shown on the contact page",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
  },
  {
    key: "noise.contact.subheader",
    label: "Contact Page Subheader",
    description: "Short intro below the contact heading",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue:
      "We'd love to hear from you. Reach out about custom orders, collaborations, or just to say hello.",
  },
  {
    key: "noise.contact-image",
    label: "Contact Page Image",
    description: "Editorial image displayed alongside the contact form",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
  },
];

const contactFaqData: TemplateField[] = [
  {
    key: "noise.contact-faq-title",
    label: "FAQ Section Title",
    description: "Heading for the FAQ accordion section",
    type: "text",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Questions & Answers",
  },
  {
    key: "noise.contact-faq-subtitle",
    label: "FAQ Section Subtitle",
    description: "Short intro text below the FAQ heading",
    type: "textarea",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-1",
    defaultValue: "Can't find what you're looking for? Send us a message.",
  },
  {
    key: "noise.contact-frequently-asked-questions",
    label: "Frequently Asked Questions",
    description: "List of Q&A pairs for the FAQ accordion",
    type: "list",
    page: "contact",
    group: "contact.faq",
    gridColumn: "col-span-full",
    maxItems: 10,
    itemSchema: [
      { key: "question", label: "Question", type: "text", placeholder: "e.g. Do you accept custom orders?" },
      { key: "answer", label: "Answer", type: "textarea", placeholder: "e.g. Yes! We love creating one-of-a-kind pieces." },
    ],
  },
];

// ─── Shop Page ────────────────────────────────────────────────────────────────

const shopListingData: TemplateField[] = [
  {
    key: "noise.shop-listing-heading",
    label: "Shop Page Heading",
    description: "Heading for the shop listing page",
    type: "text",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-1",
    defaultValue: "The Collection",
  },
  {
    key: "noise.shop-listing-intro",
    label: "Shop Page Intro",
    description: "Optional intro text below the shop heading",
    type: "textarea",
    page: "shop",
    group: "shop.listing",
    gridColumn: "col-span-full",
  },
];

// ─── Blog Page ────────────────────────────────────────────────────────────────

const blogListingData: TemplateField[] = [
  {
    key: "noise.blog-listing-heading",
    label: "Blog Page Heading",
    description: "Heading for the blog listing page",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "Stories & Perspectives",
  },
  {
    key: "noise.blog-listing-intro",
    label: "Blog Page Intro",
    description: "Optional intro text below the blog heading",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
  },
];

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "noise.global.authentication-image",
    label: "Authentication Page Image",
    description: "Editorial image shown on sign-in/sign-up pages",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
  },
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

const fieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero Section",
    description: "Full-viewport hero with background image and headline",
    icon: "🎭",
    columns: 2,
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
    id: "about.hero",
    title: "About Hero",
    description: "Hero section for the about page",
    icon: "🖼",
    columns: 2,
  },
  {
    id: "about.story",
    title: "Brand Story",
    description: "In-depth brand narrative with images",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.craftsmanship",
    title: "Craftsmanship",
    description: "Feature highlights and craft details",
    icon: "🧶",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "About CTA",
    description: "Call-to-action at the bottom of the about page",
    icon: "🛒",
    columns: 1,
  },
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Contact page header, subheader, and image",
    icon: "📧",
    columns: 2,
  },
  {
    id: "contact.faq",
    title: "FAQ Section",
    description: "Frequently asked questions accordion",
    icon: "❓",
    columns: 1,
  },
  {
    id: "shop.listing",
    title: "Shop Page",
    description: "Heading and intro for the shop listing page",
    icon: "🏪",
    columns: 1,
  },
  {
    id: "blog.listing",
    title: "Blog Page",
    description: "Heading and intro for the blog listing page",
    icon: "✍️",
    columns: 1,
  },
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Image shown on sign-in and sign-up pages",
    icon: "🔑",
    columns: 1,
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const noiseData = {
  noise: [
    ...homepageHeroData,
    ...homepageEditorialData,
    ...homepageAboutTeaserData,
    ...homepageFeaturedData,
    ...homepageTestimonialsData,
    ...aboutHeroData,
    ...aboutStoryData,
    ...aboutCraftsmanshipData,
    ...aboutCtaData,
    ...contactPageData,
    ...contactFaqData,
    ...shopListingData,
    ...blogListingData,
    ...globalAuthenticationData,
  ],
};

export const noiseFieldGroups = {
  noise: fieldGroups,
};

const _noiseFieldMap = new Map(
  noiseData.noise.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  const raw =
    customFields != null &&
    typeof customFields === "object" &&
    !Array.isArray(customFields)
      ? (customFields as Record<string, string>)
      : {};
  const out: Record<string, string> = {};
  for (const key of keys) {
    const custom = raw[key]?.trim();
    out[key] = custom ?? _noiseFieldMap.get(key)?.defaultValue ?? "";
  }
  return out;
}
