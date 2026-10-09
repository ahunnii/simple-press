import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultEventsData,
  defaultEventsFieldGroups,
} from "../../default/events";

/**
 * Glove's Events + Event pages render Default's `default.events.*` copy (read
 * through Default's resolver) on glove's generic base. These re-export the
 * same fields/groups so glove's editor lists them, plus the section curation
 * (mirrors `default/sections.ts`; the page body carries the matching
 * `data-sp-group`s).
 */
export const gloveEventsData = defaultEventsData;
export const gloveEventsFieldGroups = defaultEventsFieldGroups;

export const gloveEventsSections: TemplateSection[] = [
  {
    id: "events.hero",
    page: "events",
    title: "Hero",
    groupIds: ["events.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "events.list",
    page: "events",
    title: "List",
    description: "Upcoming event rows and empty-state copy",
    groupIds: ["events.list"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.events],
  },
  {
    id: "events.cta",
    page: "events",
    title: "Closing banner",
    description: "Bottom banner inviting visitors to get in touch",
    groupIds: ["events.cta"],
    order: 2,
    hideable: true,
  },
];
