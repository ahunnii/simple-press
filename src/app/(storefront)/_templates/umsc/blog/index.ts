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
 * round-2 trap). Two are left out because umsc has no eyebrow/kicker labels
 * by design (design.md "Typography": "No eyebrow/kicker labels"), so the
 * pages never render them and the editor must not offer a dead field:
 * `default.blog.listing-eyebrow` and `default.blog.post-eyebrow`.
 *
 * Copy Default never had (the band's optional photo, the card link, the
 * designed empty state, the closing band on posts) is new `umsc.blog.*` keys, in design.md's voice,
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

const inheritedBlogData: TemplateField[] = defaultBlogData.filter(
  (field) => !UMSC_BLOG_OMITTED_KEYS.has(field.key),
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
  ...inheritedBlogData,
  // blog.header — the listing band's optional photo (index page only; a
  // post's band stays plain).
  ...umscHeroPhotoFields("blog", "blog.header"),
  ...blogListData,
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
    id: "blog.cta",
    title: "Closing banner",
    description: "Band at the bottom of every post, with a button to the shop.",
    icon: "🕯️",
    columns: 2,
  },
];

/** Visual render order: index page first, then the post page's sections. */
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
    id: "blog.list",
    page: "blog",
    title: "Posts",
    description: "The latest post, the post grid, or the empty state",
    groupIds: ["blog.list"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.blog],
  },
  {
    id: "blog.post",
    page: "blog",
    renderContext: "blog-post",
    title: "Blog post",
    description: "Related-posts heading at the bottom of a post",
    groupIds: ["blog.post"],
    order: 2,
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
    order: 3,
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
