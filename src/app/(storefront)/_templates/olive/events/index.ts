import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultEventsData,
  defaultEventsFieldGroups,
} from "../../default/events";

/**
 * Events (`/events`, `/events/<slug>`) field registry for olive.
 *
 * Olive's events pages keep reading Default's `default.events.*` keys
 * through Default's resolver (owner-saved copy carries over untouched; only
 * Default's field map knows their `defaultValue`s), so the fields are
 * declared here verbatim — that is what gives them a panel in olive's
 * editor (the pollen round-2 trap).
 *
 * One exception: `default.events.hero-eyebrow` is left out. Olive's heading
 * block has no overline by design (see `OliveSectionHeading`: "no overline,
 * kicker or section-number prop and there never will be"), so the pages
 * don't render it and the editor must not offer a field that does nothing.
 *
 * The page components are NOT re-exported here (circular-import guard, same
 * as bamboo/services): the registry imports them from their own files.
 */
export const OLIVE_EVENTS_OMITTED_KEYS = new Set([
  "default.events.hero-eyebrow",
]);

export const oliveEventsData: TemplateField[] = defaultEventsData.filter(
  (field) => !OLIVE_EVENTS_OMITTED_KEYS.has(field.key),
);

export const oliveEventsFieldGroups: TemplateFieldGroup[] =
  defaultEventsFieldGroups;

/** Mirrors `default/sections.ts` (same ids, titles and hideability). */
export const oliveEventsSections: TemplateSection[] = [
  {
    id: "events.hero",
    page: "events",
    title: "Hero",
    description: "Page heading and intro text",
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
