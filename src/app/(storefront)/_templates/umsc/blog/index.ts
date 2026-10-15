import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";
import { SECTION_LINKS } from "~/lib/section-links";

import { defaultBlogData, defaultBlogFieldGroups } from "../../default/blog";
import { umscHeroPhotoFields } from "../shared/umsc-hero-fields";

/**
 * Blog (`/blog`, `/blog/<slug>`) field registry for umsc — parity PF22
 * (package TP7, docs/templates/umsc/parity-plan-2026-09-28.md).
 *
 * Until 2026-09-28 umsc rendered Default's blog pages, so the owner's saved
 * copy (if any) lives under Default's `default.blog.*` keys. The umsc pages
 * keep reading those keys through Default's resolver and declare them here
 * verbatim — that is what gives them a panel in umsc's editor (the pollen
 * round-2 trap). The one exception is `default.blog.listing-title`, re-labelled
 * with an empty default so the heading can follow `umsc.blog.page-name`. Two are left out because umsc has no eyebrow/kicker labels
 * by design (design.md "Typography": "No eyebrow/kicker labels"), so the
 * pages never render them and the editor must not offer a dead field:
 * `default.blog.listing-eyebrow` and `default.blog.post-eyebrow`.
 *
 * Copy Default never had (the band's optional photo, the card link, the
 * designed empty state, the closing band on posts, and the listing page's
 * community gallery / reviews / closing band — the page is the "Community"
 * page at the same `/blog` URL) is new `umsc.blog.*` keys, in design.md's voice,
 * read through `resolveUmscBlogFields` (this module's own map) so defaults
 * and "blank hides" behave the same before and after the root `index.ts`
 * spreads `umscBlogData`.
 *
 * The page components are NOT re-exported here (circular-import guard): the
 * registry imports them from their own files.
 */

export const UMSC_BLOG_OMITTED_KEYS = new Set([
  "default.blog.listing-eyebrow",
  "default.blog.post-eyebrow",
]);

/**
 * The page's name ("Community" by default, "Blog" if the owner prefers).
 * Platform routes read it through `resolveBlogPageName` for the `/blog`
 * fallback `<title>` and the post breadcrumb trail; the listing heading
 * falls back to it, which is why Default's `listing-title` loses its "Blog"
 * default here (a saved heading still wins).
 */
const blogPageNameField: TemplateField = {
  key: "umsc.blog.page-name",
  label: "Page name",
  description:
    "What this page is called in search results, browser tabs and the link trail on each post — for example Community or Blog. The heading uses it too unless you type your own.",
  type: "text",
  page: "blog",
  group: "blog.header",
  gridColumn: "col-span-full",
  defaultValue: "Community",
  placeholder: "Community",
};

const inheritedBlogData: TemplateField[] = defaultBlogData
  .filter((field) => !UMSC_BLOG_OMITTED_KEYS.has(field.key))
  .map((field) =>
    field.key === "default.blog.listing-title"
      ? {
          ...field,
          label: "Heading",
          description:
            "Big heading at the top of this page. Leave empty to use the page name.",
          defaultValue: "",
          placeholder: "Same as the page name",
        }
      : field,
  );

// ─── blog.list — the post list and its empty state ─────────────────────────

const blogListData: TemplateField[] = [
  {
    key: "umsc.blog.card-link-label",
    label: "Post link text",
    description:
      "Small link under each post on the blog page. Leave blank to hide it (the whole card stays clickable).",
    type: "text",
    page: "blog",
    group: "blog.list",
    gridColumn: "col-span-1",
    defaultValue: "Read the story",
    placeholder: "e.g. Read more",
  },
  {
    key: "umsc.blog.empty-heading",
    label: "Empty state heading",
    description: "Shown in place of the posts while none are published.",
    type: "text",
    page: "blog",
    group: "blog.list",
    gridColumn: "col-span-1",
    defaultValue: "Stories are on their way.",
    placeholder: "e.g. No posts yet",
  },
  {
    key: "umsc.blog.empty-body",
    label: "Empty state message",
    description: "One line under the empty-state heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.list",
    gridColumn: "col-span-full",
    defaultValue:
      "Monique shares new scents, market dates, and care tips here. Check back soon.",
    placeholder: "One short sentence",
  },
  {
    key: "umsc.blog.empty-link-label",
    label: "Empty state link text",
    description:
      "Link under the empty-state message. Leave blank to hide the link.",
    type: "text",
    page: "blog",
    group: "blog.list",
    gridColumn: "col-span-1",
    defaultValue: "Browse the shop",
    placeholder: "e.g. Shop now",
  },
  {
    key: "umsc.blog.empty-link-url",
    label: "Empty state link",
    description:
      "Where the empty-state link goes. Hidden automatically when it points at a page that's switched off.",
    type: "url",
    page: "blog",
    group: "blog.list",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

// ─── blog.gallery — community photo gallery (hideable, listing page) ───────

const blogGalleryData: TemplateField[] = [
  {
    key: "umsc.blog.gallery-heading",
    label: "Heading",
    description: "Heading above the community photos on the blog page.",
    type: "text",
    page: "blog",
    group: "blog.gallery",
    gridColumn: "col-span-full",
    defaultValue: "Out in the community",
    placeholder: "e.g. Around town",
  },
  {
    key: "umsc.blog.gallery",
    label: "Gallery",
    description:
      "Pick a gallery of market and community photos. Galleries are created under Admin → Galleries; its layout, aspect ratio, captions, and lightbox settings are honored here. Leave unset to hide this section on your site.",
    type: "gallery",
    page: "blog",
    group: "blog.gallery",
    gridColumn: "col-span-full",
  },
];

// ─── blog.reviews — latest testimonials (hideable, listing page) ───────────

const blogReviewsData: TemplateField[] = [
  {
    key: "umsc.blog.reviews-heading",
    label: "Heading",
    description: "Heading above the customer reviews on the blog page.",
    type: "text",
    page: "blog",
    group: "blog.reviews",
    gridColumn: "col-span-1",
    defaultValue: "Kind words",
    placeholder: "e.g. What people say",
  },
  {
    key: "umsc.blog.reviews-lede",
    label: "Intro text",
    description:
      "One sentence beneath the reviews heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.reviews",
    gridColumn: "col-span-1",
    defaultValue:
      "What people say after markets, pop-ups and community events.",
    placeholder: "One short sentence",
  },
  {
    key: "umsc.blog.reviews-empty-text",
    label: "Empty state text",
    description:
      "Shown beside the Google review link when there are no reviews yet.",
    type: "text",
    page: "blog",
    group: "blog.reviews",
    gridColumn: "col-span-1",
    defaultValue: "Reviews are on their way.",
    placeholder: "e.g. No reviews yet",
  },
];

// ─── blog.closing — closing band on the listing page (hideable) ────────────

const blogClosingData: TemplateField[] = [
  {
    key: "umsc.blog.closing-heading",
    label: "Heading",
    description: "Heading of the closing band at the bottom of the blog page.",
    type: "text",
    page: "blog",
    group: "blog.closing",
    gridColumn: "col-span-full",
    defaultValue: "Have an event in mind?",
    placeholder: "e.g. Let's work together",
  },
  {
    key: "umsc.blog.closing-body",
    label: "Text",
    description:
      "One line under the closing band's heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.closing",
    gridColumn: "col-span-full",
    defaultValue:
      "Invite us to your market, pop-up or community event. We'd love to be there.",
    placeholder: "One short sentence",
  },
  {
    key: "umsc.blog.closing-button-label",
    label: "Button text",
    description: "Text on the blog page's closing band button.",
    type: "text",
    page: "blog",
    group: "blog.closing",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
    placeholder: "e.g. Contact us",
  },
  {
    key: "umsc.blog.closing-button-url",
    label: "Button link",
    description:
      "Where the blog page's closing band button goes. Leave blank to hide the button; it also hides when the page it points at is switched off.",
    type: "url",
    page: "blog",
    group: "blog.closing",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

// ─── blog.cta — closing band on every post (hideable) ──────────────────────

const blogCtaData: TemplateField[] = [
  {
    key: "umsc.blog.cta-heading",
    label: "Heading",
    description: "Heading of the closing band at the bottom of every post.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-full",
    defaultValue: "Find a scent for your room.",
    placeholder: "e.g. Shop the latest batch",
  },
  {
    key: "umsc.blog.cta-body",
    label: "Text",
    description: "One line under the closing heading. Leave blank to hide.",
    type: "textarea",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Small-batch soy candles, soaps, and body care, poured and packed by hand in Detroit.",
    placeholder: "One short sentence",
  },
  {
    key: "umsc.blog.cta-button-label",
    label: "Button text",
    description: "Text on the closing band's button.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Shop products",
    placeholder: "e.g. Shop candles",
  },
  {
    key: "umsc.blog.cta-button-url",
    label: "Button link",
    description:
      "Where the closing band's button goes. Leave blank to hide the button; it also hides when the page it points at is switched off.",
    type: "url",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const umscBlogData: TemplateField[] = [
  blogPageNameField,
  ...inheritedBlogData,
  // blog.header — the listing band's optional photo (index page only; a
  // post's band stays plain).
  ...umscHeroPhotoFields("blog", "blog.header"),
  ...blogListData,
  ...blogGalleryData,
  ...blogReviewsData,
  ...blogClosingData,
  ...blogCtaData,
];

export const umscBlogFieldGroups: TemplateFieldGroup[] = [
  // `blog.header` ("Blog listing", description extended for the photo) and
  // `blog.post` ("Blog post") verbatim.
  ...defaultBlogFieldGroups.map((group) =>
    group.id === "blog.header"
      ? {
          ...group,
          description: "Heading, intro and optional photo on the blog index",
        }
      : group,
  ),
  {
    id: "blog.list",
    title: "Posts",
    description:
      "Link text under each post and the empty state shown while no posts are published.",
    icon: "🗞️",
    columns: 2,
  },
  {
    id: "blog.gallery",
    title: "Gallery",
    description: "Community photos shown above the posts on the blog page.",
    icon: "📸",
    columns: 2,
  },
  {
    id: "blog.reviews",
    title: "Reviews",
    description: "Latest customer reviews below the posts on the blog page.",
    icon: "⭐",
    columns: 2,
  },
  {
    id: "blog.closing",
    title: "Page closing banner",
    description:
      "Band at the bottom of the blog page, with a button to your contact page.",
    icon: "🎪",
    columns: 2,
  },
  {
    id: "blog.cta",
    title: "Closing banner",
    description: "Band at the bottom of every post, with a button to the shop.",
    icon: "🕯️",
    columns: 2,
  },
];

/**
 * Visual render order. The listing page is the "Community" page (header,
 * community gallery, posts, reviews, closing band); the post page's sections
 * come after it.
 */
export const umscBlogSections: TemplateSection[] = [
  {
    id: "blog.header",
    page: "blog",
    title: "Blog listing",
    description:
      "Heading, intro, optional photo and search message on the blog page",
    groupIds: ["blog.header"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.blog],
  },
  {
    id: "blog.gallery",
    page: "blog",
    title: "Gallery",
    description: "Heading and community photo gallery above the posts",
    groupIds: ["blog.gallery"],
    order: 1,
    hideable: true,
    links: [SECTION_LINKS.galleries],
  },
  {
    id: "blog.list",
    page: "blog",
    title: "Posts",
    description: "The latest post, the post grid, or the empty state",
    groupIds: ["blog.list"],
    order: 2,
    hideable: false,
    links: [SECTION_LINKS.blog],
  },
  {
    id: "blog.reviews",
    page: "blog",
    title: "Reviews",
    description: "Latest approved customer reviews below the posts",
    groupIds: ["blog.reviews"],
    order: 3,
    hideable: true,
    links: [SECTION_LINKS.testimonials],
  },
  {
    id: "blog.closing",
    page: "blog",
    title: "Page closing banner",
    description: "Band at the bottom of the blog page, not on posts",
    groupIds: ["blog.closing"],
    order: 4,
    hideable: true,
  },
  {
    id: "blog.post",
    page: "blog",
    renderContext: "blog-post",
    title: "Blog post",
    description: "Related-posts heading at the bottom of a post",
    groupIds: ["blog.post"],
    order: 5,
    hideable: false,
    links: [SECTION_LINKS.blog],
  },
  {
    id: "blog.cta",
    page: "blog",
    renderContext: "blog-post",
    title: "Closing banner",
    description: "Band at the bottom of every post",
    groupIds: ["blog.cta"],
    order: 6,
    hideable: true,
  },
];

const _blogFieldMap = new Map(umscBlogData.map((f) => [f.key, f]));

/** `resolveFields` over the blog fields only (see header). */
export function resolveUmscBlogFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _blogFieldMap);
}
