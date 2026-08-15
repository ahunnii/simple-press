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
 * the four global/chrome sections appended (page "global"). Every field group
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
        "Header logo and the call-us phone pill shown on every page. Nav labels live in Content → Navigation; the phone number in Settings → General",
      groupIds: ["global.branding"],
      order: 0,
      hideable: false,
      links: [
        { label: "Navigation", href: "/admin/content/navigation" },
        { label: "Business info", href: "/admin/settings/general" },
      ],
    },
    {
      id: "global.footer",
      page: "global",
      title: "Footer",
      description:
        "Dark footer columns — column headings, areas served and helpful links — shown on every page. Contact details, hours and the about blurb are pulled from Settings and Content → Branding",
      groupIds: ["global.footer"],
      order: 1,
      hideable: false,
      links: [
        { label: "Branding", href: "/admin/content/branding" },
        { label: "Business info", href: "/admin/settings/general" },
        { label: "Hours", href: "/admin/settings/hours" },
      ],
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
    {
      id: "global.authentication",
      page: "global",
      title: "Authentication",
      description: "Image shown on the sign-in and sign-up pages.",
      groupIds: ["global.authentication"],
      order: 3,
    },
  ],
};
