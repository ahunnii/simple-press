import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

import { DREAM_QUOTE_HREF } from "../shared/dream-quote-href";

/**
 * Fields / groups / sections for dream's GenericPage (any published CMS
 * page without a dedicated slot).
 *
 * The page body itself is CMS rich text, not template fields. What the
 * template owns is the closing "Request an Estimate Quote" cloud band —
 * the same `DreamQuoteCta` that closes every service page — and that band
 * is shared by EVERY custom page, so its fields live on `page: "global"`
 * (not a page key of their own, which would not map to any editor preview
 * route):
 *   - `global.page-cta`: the closing quote band (hideable)
 * Only regular pages (`page.type` "page" / "custom") show it — never
 * policies or blog posts. The section id equals the group id and the
 * `data-sp-group` value rendered by dream-generic-page.tsx (mirrors
 * `wealth/generic/index.ts`).
 *
 * Do not import runtime values from `~/lib/template-fields` here: it
 * aggregates every template's root index.ts, which imports this module.
 */

export const DREAM_PAGE_CTA_KEYS = {
  heading: "dream.global.page-cta-heading",
  accent: "dream.global.page-cta-accent",
  lede: "dream.global.page-cta-lede",
  label: "dream.global.page-cta-label",
  url: "dream.global.page-cta-url",
} as const;

const PAGE_CTA_DESCRIPTION =
  "Closing quote banner at the bottom of your custom pages (not policies or blog posts).";

export const dreamGenericData: TemplateField[] = [
  // ── global.page-cta ───────────────────────────────────────────────────────
  {
    key: DREAM_PAGE_CTA_KEYS.heading,
    label: "Heading",
    description:
      "Heading for the closing banner at the bottom of your custom pages (not policies or blog posts); the highlighted word follows it. Leave blank to hide the banner.",
    type: "text",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: DREAM_PAGE_CTA_KEYS.accent,
    label: "Highlighted word",
    description:
      'Script-styled word rendered after the heading (e.g. "Estimate Quote"). Leave blank to hide.',
    type: "text",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: DREAM_PAGE_CTA_KEYS.lede,
    label: "Intro",
    description: "Short line under the closing banner's heading.",
    type: "textarea",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell Selest about your event and she'll help you plan every detail.",
  },
  {
    key: DREAM_PAGE_CTA_KEYS.label,
    label: "Button label",
    description: "Label for the closing banner's button.",
    type: "text",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: DREAM_PAGE_CTA_KEYS.url,
    label: "Button link",
    description: "Where the closing banner's button links to.",
    type: "url",
    page: "global",
    group: "global.page-cta",
    gridColumn: "col-span-1",
    defaultValue: DREAM_QUOTE_HREF,
  },
];

export const dreamGenericFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.page-cta",
    title: "Page closing banner",
    description: PAGE_CTA_DESCRIPTION,
    icon: "💌",
    columns: 2,
  },
];

export const dreamGenericSections: TemplateSection[] = [
  {
    id: "global.page-cta",
    page: "global",
    title: "Page closing banner",
    description: PAGE_CTA_DESCRIPTION,
    groupIds: ["global.page-cta"],
    // After global.branding (0), global.authentication (1), global.account (2).
    order: 3,
    hideable: true,
  },
];
