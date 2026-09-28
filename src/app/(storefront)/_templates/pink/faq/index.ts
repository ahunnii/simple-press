import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { defaultFaqData, defaultFaqFieldGroups } from "../../default/faq";

/**
 * `/faq` for pink — `pink-faq-page.tsx` restyles Default's FAQ page and keeps
 * reading Default's `default.faq.*` keys (no `pink.faq.*` duplicates), so
 * these are Default's declarations re-exported under pink's aggregator names.
 * Spreading them into pink's root registry is what makes the "FAQ page" panel
 * show up in pink's editor (the pollen round-2 trap: reusing Default's keys
 * without declaring them leaves the editor with no panel for them).
 *
 * Triple-match: section `faq.page` === field group `faq.page` ===
 * `data-sp-group="faq.page"` on the page root.
 */
export const pinkFaqData = defaultFaqData;
export const pinkFaqFieldGroups = defaultFaqFieldGroups;

export const pinkFaqSections: TemplateSection[] = [
  {
    id: "faq.page",
    page: "faq",
    // Matches Default's group title (`defaultFaqFieldGroups`), as the strict
    // lint requires.
    title: "FAQ page",
    description: "Heading and empty state on the FAQ page.",
    groupIds: ["faq.page"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.faq],
  },
];
