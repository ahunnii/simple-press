import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

import { DREAM_QUOTE_HREF } from "../shared/dream-quote-href";

/**
 * Blog / BlogPost ("/blog", "/blog/<slug>") — parity-plan-2026-09-28 PF19
 * (dream previously fell back to Default here). Both pages share
 * `page: "blog"`. `BlogPage` owns `blog.header` (hero) + `blog.listing`
 * (search/empty copy); `BlogPostPage` owns `blog.related` (the always-shown
 * related-posts heading) + `blog.cta` (the hideable closing Estimate Quote
 * band, shared across every post — not per-post, per the BlogPostPage
 * playbook). No fields for the post's own title/excerpt/body/image — those
 * are `Page` data, not owner copy.
 *
 * Group-id convention: `"<page>.<group>"`, unprefixed — this is what makes
 * the sectionGroupAttr/fieldAttr/isSectionVisible triple match sections.ts
 * and the rendered `data-sp-group` (mirrors dream's services/about domains).
 */

// ─── blog.header — NOT hideable (the page's sole <h1>) ─────────────────────

const blogHeaderData: TemplateField[] = [
  {
    key: "dream.blog.hero-heading",
    label: "Heading",
    description: "The page's H1, shown before the highlighted word.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-1",
    defaultValue: "The",
  },
  {
    key: "dream.blog.hero-accent",
    label: "Highlighted word",
    description:
      "One script-styled word after the heading. Never more than one word.",
    type: "text",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-1",
    defaultValue: "Journal",
  },
  {
    key: "dream.blog.hero-lede",
    label: "Intro",
    description: "Short line under the hero heading.",
    type: "textarea",
    page: "blog",
    group: "blog.header",
    gridColumn: "col-span-full",
    defaultValue:
      "Ideas, behind-the-scenes, and the occasional happy tear, from Selest's events.",
  },
];

// ─── blog.listing — NOT hideable (wraps the search/list/empty area) ────────

const blogListingData: TemplateField[] = [
  {
    key: "dream.blog.listing-search-empty",
    label: "No search results message",
    description: "Shown when a search on the journal matches no stories.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "No stories match your search.",
  },
  {
    key: "dream.blog.listing-empty-heading",
    label: "Empty state heading",
    description: "Shown on the journal page before any stories are published.",
    type: "text",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-1",
    defaultValue: "The journal is just getting started",
  },
  {
    key: "dream.blog.listing-empty-body",
    label: "Empty state message",
    description: "Short line under the empty state heading.",
    type: "textarea",
    page: "blog",
    group: "blog.listing",
    gridColumn: "col-span-full",
    defaultValue: "Selest's first stories are on their way. Check back soon.",
  },
];

// ─── blog.related — NOT hideable (BlogPostPage only) ───────────────────────

const blogRelatedData: TemplateField[] = [
  {
    key: "dream.blog.related-heading",
    label: "Related posts heading",
    description: "Heading above the related stories at the bottom of a post.",
    type: "text",
    page: "blog",
    group: "blog.related",
    gridColumn: "col-span-1",
    defaultValue: "More stories",
  },
  {
    key: "dream.blog.related-empty",
    label: "No related posts message",
    description: "Shown at the bottom of a post when there are no others yet.",
    type: "text",
    page: "blog",
    group: "blog.related",
    gridColumn: "col-span-1",
    defaultValue: "More stories are on their way.",
  },
];

// ─── blog.cta — hideable (BlogPostPage's closing Estimate Quote band) ──────

const blogCtaData: TemplateField[] = [
  {
    key: "dream.blog.cta-heading",
    label: "Heading",
    description:
      "Plain part of this section's heading, before the highlighted words.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Ready to plan your",
  },
  {
    key: "dream.blog.cta-accent",
    label: "Highlighted words",
    description:
      'Script-styled words that follow the heading (e.g. "Estimate Quote").',
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream.blog.cta-lede",
    label: "Intro",
    description: "Short line under this section's heading.",
    type: "textarea",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Loved something you saw here? Tell Selest about your event and she'll help you shape the look.",
  },
  {
    key: "dream.blog.cta-label",
    label: "Button label",
    description: "Label for this section's button.",
    type: "text",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream.blog.cta-url",
    label: "Button link",
    description: "Where this section's button links to.",
    type: "url",
    page: "blog",
    group: "blog.cta",
    gridColumn: "col-span-1",
    defaultValue: DREAM_QUOTE_HREF,
  },
];

// ─── Aggregated export ──────────────────────────────────────────────────────

export const dreamBlogData: TemplateField[] = [
  ...blogHeaderData,
  ...blogListingData,
  ...blogRelatedData,
  ...blogCtaData,
];

export const dreamBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.header",
    title: "Page header",
    description: "Heading, highlighted word, and intro",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "blog.listing",
    title: "Journal listing",
    description: "Search and empty-state copy on the journal index",
    icon: "📝",
    columns: 2,
  },
  {
    id: "blog.related",
    title: "Related stories",
    description: "Heading and empty-state message at the bottom of a post",
    icon: "📰",
    columns: 2,
  },
  {
    id: "blog.cta",
    title: "Quote request",
    description: "Closing section with a heading and a button, on every post",
    icon: "✉️",
    columns: 2,
  },
];

export const dreamBlogSections: TemplateSection[] = [
  {
    id: "blog.header",
    page: "blog",
    title: "Page header",
    description: "Logo, heading, and intro",
    groupIds: ["blog.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "blog.listing",
    page: "blog",
    title: "Journal listing",
    description: "Search and empty-state copy on the journal index",
    groupIds: ["blog.listing"],
    order: 1,
    hideable: false,
  },
  {
    id: "blog.related",
    page: "blog",
    title: "Related stories",
    description: "Heading and empty-state message at the bottom of a post",
    groupIds: ["blog.related"],
    order: 2,
    hideable: false,
  },
  {
    id: "blog.cta",
    page: "blog",
    title: "Quote request",
    description: "Closing section with a heading and a button, on every post",
    groupIds: ["blog.cta"],
    order: 3,
    hideable: true,
  },
];
