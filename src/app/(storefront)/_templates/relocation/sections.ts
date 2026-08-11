import type { TemplateSection } from "~/lib/template-sections";

import { relocationAboutSections } from "./about";
import { relocationContactSections } from "./contact";
import { relocationFaqSections } from "./faq";
import { relocationGenericSections } from "./generic";
import { relocationHomepageSections } from "./homepage";
import { relocationServicesSections } from "./services";
import { relocationTestimonialsSections } from "./testimonials";

/**
 * Curated section registry for the `relocation` template, merged in page order
 * (homepage → about → testimonials → services → contact → faq → generic) with
 * the three global/chrome sections appended (page "global"). Every field group
 * defined in `index.ts` must be covered by exactly one section here
 * (triple-match invariant, asserted by `src/lib/template-sections.test.ts`).
 *
 * `global.credentials` is hideable and self-gated inside
 * `shared/relocation-credentials-band.tsx` — one toggle hides the band on all
 * six pages that render it.
 */
export const relocationSections: Record<string, TemplateSection[]> = {
  relocation: [
    ...relocationHomepageSections,
    ...relocationAboutSections,
    ...relocationTestimonialsSections,
    ...relocationServicesSections,
    ...relocationContactSections,
    ...relocationFaqSections,
    ...relocationGenericSections,
    {
      id: "global.branding",
      page: "global",
      title: "Header & Branding",
      description:
        "Logo, nav labels (About Us dropdown, Services, Contact Us) and the call-us phone pill shown in the header on every page",
      groupIds: ["global.branding"],
      order: 0,
      hideable: false,
    },
    {
      id: "global.footer",
      page: "global",
      title: "Footer",
      description:
        "Dark footer columns — about blurb, services list, areas served, helpful links and contact details — shown on every page",
      groupIds: ["global.footer"],
      order: 1,
      hideable: false,
    },
    {
      id: "global.credentials",
      page: "global",
      title: "Credentials & Affiliations",
      description:
        "Trust band with the ATA / MMA / Samaritas / HireSafe logos that closes Homepage, Services, Backstory, Reviews, Contact and FAQ",
      groupIds: ["global.credentials"],
      order: 2,
      hideable: true,
    },
  ],
};
