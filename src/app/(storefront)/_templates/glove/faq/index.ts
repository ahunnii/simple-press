import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { defaultFaqData, defaultFaqFieldGroups } from "../../default/faq";

/**
 * Glove's FAQ page renders Default's `default.faq.*` copy (read through
 * Default's resolver) on glove's generic base. Re-exported so glove's editor
 * lists the fields, plus the matching section curation.
 */
export const gloveFaqData = defaultFaqData;
export const gloveFaqFieldGroups = defaultFaqFieldGroups;

export const gloveFaqSections: TemplateSection[] = [
  {
    id: "faq.page",
    page: "faq",
    title: "FAQ page",
    description: "Heading and empty state on the FAQ page",
    groupIds: ["faq.page"],
    order: 0,
    hideable: false,
    links: [SECTION_LINKS.faq],
  },
];
