import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultDonateData,
  defaultDonateFieldGroups,
} from "../../default/donate";

/**
 * Donate (`/donate`) field registry for umsc — parity PF23 (package TP7).
 * Default's `default.donate.*` keys, declared verbatim so umsc's editor lists
 * them (the page reads them through Default's resolver; umsc rendered
 * Default's donate page until 2026-09-28). None are omitted — Default's
 * donate page has no eyebrow. The amount presets, label and payment lanes
 * come from Settings → Donations, not template fields.
 *
 * The page component is NOT re-exported here (circular-import guard).
 */
export const umscDonateData: TemplateField[] = defaultDonateData;

export const umscDonateFieldGroups: TemplateFieldGroup[] =
  defaultDonateFieldGroups;

/** Mirrors `default/sections.ts`. */
export const umscDonateSections: TemplateSection[] = [
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
