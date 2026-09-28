import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { defaultFaqData, defaultFaqFieldGroups } from "../../default/faq";

/**
 * FAQ (`/faq`) field registry for noise — Default's `default.faq.*` keys,
 * declared verbatim so noise's editor lists them (the page reads them
 * through Default's resolver + `FAQ_PAGE_*_DEFAULT` fallbacks). The page
 * component is NOT re-exported here (circular-import guard).
 */
export const noiseFaqData: TemplateField[] = defaultFaqData;

export const noiseFaqFieldGroups: TemplateFieldGroup[] = defaultFaqFieldGroups;

/** Mirrors `default/sections.ts`. */
export const noiseFaqSections: TemplateSection[] = [
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
