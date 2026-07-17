import type { TemplateSection } from "~/lib/template-sections";

import { coopAboutSections } from "./about";
import { coopContactSections } from "./contact";
import { coopGenericSections } from "./generic";
import { coopHomepageSections } from "./homepage";

/**
 * Curated section registry for the `coop` template, merged in page order:
 * homepage → about → contact → generic gallery (page "global", orders 1–4)
 * → global branding (page "global", order 0). Every field group defined in
 * `index.ts` must be covered by exactly one section here (triple-match
 * invariant, asserted by `src/lib/template-sections.test.ts`).
 */
export const coopSections: Record<string, TemplateSection[]> = {
  coop: [
    ...coopHomepageSections,
    ...coopAboutSections,
    ...coopContactSections,
    ...coopGenericSections,
    {
      id: "global.branding",
      page: "global",
      title: "Site Branding",
      description:
        "Header gallery-nav link label/URL and footer Instagram/Facebook links — shown in the header and footer on every page",
      groupIds: ["global.branding"],
      order: 0,
      hideable: false,
    },
  ],
};
