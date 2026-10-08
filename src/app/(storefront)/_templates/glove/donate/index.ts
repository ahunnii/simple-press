import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultDonateData,
  defaultDonateFieldGroups,
} from "../../default/donate";

/**
 * Glove's Donate page renders Default's `default.donate.*` copy (read through
 * Default's resolver) on glove's generic base. Re-exported so glove's editor
 * lists the fields, plus the matching section curation.
 */
export const gloveDonateData = defaultDonateData;
export const gloveDonateFieldGroups = defaultDonateFieldGroups;

export const gloveDonateSections: TemplateSection[] = [
  {
    id: "donate.hero",
    page: "donate",
    title: "Hero",
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
