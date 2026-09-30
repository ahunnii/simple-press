import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultDonateData,
  defaultDonateFieldGroups,
} from "../../default/donate";

/**
 * Donate (`/donate`) field registry for dream — Default's `default.donate.*`
 * keys, declared verbatim so dream's editor lists them (the page reads them
 * through Default's resolver). The amount presets, label and payment lanes
 * come from Settings → Donations, not template fields. The page component
 * is NOT re-exported here (circular-import guard).
 */
export const dreamDonateData: TemplateField[] = defaultDonateData;

export const dreamDonateFieldGroups: TemplateFieldGroup[] =
  defaultDonateFieldGroups;

/** Mirrors `default/sections.ts`. */
export const dreamDonateSections: TemplateSection[] = [
  {
    id: "donate.hero",
    page: "donate",
    title: "Hero",
    description: "Page heading and intro text",
    groupIds: ["donate.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "donate.thank-you",
    page: "donate",
    title: "Thank You",
    description: "Copy shown after a successful donation",
    groupIds: ["donate.thank-you"],
    order: 1,
    hideable: false,
  },
  {
    id: "donate.other-ways",
    page: "donate",
    title: "Other Ways to Give",
    description: "Heading for the Venmo/Cash App section",
    groupIds: ["donate.other-ways"],
    order: 2,
    hideable: true,
    links: [SECTION_LINKS.donations],
  },
];
