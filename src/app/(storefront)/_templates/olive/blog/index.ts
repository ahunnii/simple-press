import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field/group/section registry for olive's `BlogPage` + `BlogPostPage` slots
 * ("The journal" — docs/templates/olive/design.md → "Per-page section
 * concepts › BlogPage" / "BlogPostPage").
 *
 * Exported FLAT per the Phase 3 export contract (mirrors pink/blog,
 * wealth/blog) — `_templates/olive/index.ts` and `sections.ts` (both locked
 * for this agent) are expected to spread `oliveBlogData` / `oliveBlogFieldGroups`
 * / `oliveBlogSections` into their own aggregation during Phase 4.
 *
 * Two groups only, matching the two numbered concepts in design.md:
 *  - `blog.hero` (page index — cover image / heading / subtitle, plus the
 *    designed empty state and the search "no results" message; NOT hideable
 *    — a blog with zero posts still needs its heading and empty state).
 *  - `blog.post` (renderContext: "blog-post" — related-posts heading + the
 *    closing CTA card shown at the end of every post; hideable). The section
 *    id, the field group id and the `data-sp-group` value are all literally
 *    "blog.post" (triple-match invariant) — this is a deliberate deviation
 *    from wealth's `blog.post` (groupIds: ["blog.cta"]) and pink's
 *    `blog.post` (groupIds: ["blog.post-related"]) shapes, per this agent's
 *    assignment brief, which calls for exactly one group carrying both the
 *    related-heading and CTA fields under the one id "blog.post".
 */

export const oliveBlogData: TemplateField[] = [
  // ── blog.hero (not hideable) ─────────────────────────────────────────────
  {
    key: "olive.blog.hero-image",
    label: "Cover photo",
    description:
      "Optional full-width photo behind the journal heading. Leave blank for the plain header instead of a photo.",
    type: "image",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "olive.blog.hero-heading",
    label: "Heading",
    description: "The journal index page's H1.",
    type: "text",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-1",
    defaultValue: "The journal",
  },
  {
    key: "olive.blog.hero-subtitle",
    label: "Subtitle",
    description: "One line under the heading.",
    type: "textarea",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Notes on new arrivals, real colours, and what we're wearing this week.",
  },
  {
    key: "olive.blog.empty-heading",
    label: "Empty journal heading",
    description: "Shown when there are no published posts yet.",
    type: "text",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-1",
    defaultValue: "Nothing published yet",
  },
  {
    key: "olive.blog.empty-body",
    label: "Empty journal body",
    description: "One line under the empty-journal heading.",
    type: "textarea",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "The first note from the shop floor is on its way. The new arrivals are worth a look in the meantime.",
  },
  {
    key: "olive.blog.empty-cta-label",
    label: "Empty journal button label",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-1",
    defaultValue: "Shop new arrivals",
  },
  {
    key: "olive.blog.empty-cta-link",
    label: "Empty journal button link",
    description:
      "Where the empty-state button goes. Leave blank to hide the button.",
    type: "url",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
  {
    key: "olive.blog.search-empty-message",
    label: "No search results message",
    description: "Shown when a visitor's search doesn't match any post.",
    type: "text",
    page: "blog",
    group: "blog.hero",
    gridColumn: "col-span-full",
    defaultValue: "No posts match your search.",
  },

  // ── blog.post (hideable, renderContext: blog-post) ───────────────────────
  {
    key: "olive.blog.post-related-heading",
    label: "Related posts heading",
    description:
      "Heading over the related-posts band at the end of every post.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Keep reading",
  },
  {
    key: "olive.blog.post-cta-heading",
    label: "Heading",
    description:
      "Heading on the tinted card shown at the end of every post. Leave the whole section hidden via the section toggle if you'd rather not show it.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Still deciding?",
  },
  {
    key: "olive.blog.post-cta-body",
    label: "Body",
    description: "One line under the closing card's heading.",
    type: "textarea",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-full",
    defaultValue: "The new arrivals are worth a look while you're here.",
  },
  {
    key: "olive.blog.post-cta-button-text",
    label: "Button label",
    description: "Label for the closing card's button.",
    type: "text",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "Shop new arrivals",
  },
  {
    key: "olive.blog.post-cta-button-link",
    label: "Button link",
    description: "Where the closing card's button goes.",
    type: "url",
    page: "blog",
    group: "blog.post",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

export const oliveBlogFieldGroups: TemplateFieldGroup[] = [
  {
    id: "blog.hero",
    title: "Journal header",
    description:
      "Cover image, heading and subtitle on the journal index, plus its empty state and search message.",
    icon: "📰",
    columns: 2,
  } satisfies TemplateFieldGroup,
  {
    id: "blog.post",
    title: "End of post",
    description:
      "The related-posts heading and closing call-to-action card shown at the end of every journal post.",
    icon: "📚",
    columns: 2,
  } satisfies TemplateFieldGroup,
];

export const oliveBlogSections: TemplateSection[] = [
  {
    id: "blog.hero",
    page: "blog",
    title: "Journal header",
    description:
      "Cover image, heading, subtitle, and the empty/search states on the journal index.",
    groupIds: ["blog.hero"],
    order: 0,
    hideable: false,
  },
  // Blog-post context is ONE section by platform convention
  // (`template-sections.test.ts` asserts exactly one blog-post-context
  // section with id "blog.post" per curated template). Per this agent's
  // assignment, the group id is ALSO "blog.post" (unlike wealth/pink), so
  // section id == field group id == data-sp-group == "blog.post" exactly.
  {
    id: "blog.post",
    page: "blog",
    renderContext: "blog-post",
    title: "End of post",
    description:
      "Related posts and the closing call-to-action shown at the end of every post.",
    groupIds: ["blog.post"],
    order: 1,
    hideable: true,
  },
];
