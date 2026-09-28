import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import { defaultFaqData, defaultFaqFieldGroups } from "../../default/faq";

/**
 * FAQ (`/faq`) field registry for olive — Default's `default.faq.*` keys,
 * declared verbatim so olive's editor lists them (the page reads them
 * through Default's resolver + `FAQ_PAGE_*_DEFAULT` fallbacks). The page
 * component is NOT re-exported here (circular-import guard).
 */
export const oliveFaqData: TemplateField[] = defaultFaqData;

export const oliveFaqFieldGroups: TemplateFieldGroup[] = defaultFaqFieldGroups;

/** Mirrors `default/sections.ts`. */
export const oliveFaqSections: TemplateSection[] = [
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
