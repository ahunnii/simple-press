import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultEventsData,
  defaultEventsFieldGroups,
} from "../../default/events";

/**
 * Events (`/events`, `/events/<slug>`) field registry for dream — parity
 * PF20 (package TP7, docs/templates/dream/parity-plan-2026-09-28.md).
 *
 * dream's events pages sit on the generic page base (`DreamPageHero` +
 * `DreamSection`) and keep reading Default's `default.events.*` keys through
 * Default's resolver: owner-saved copy carries over untouched, and only
 * Default's field map knows their `defaultValue`s. Declaring the fields here
 * verbatim is what gives them a panel in dream's editor (the pollen
 * round-2 trap).
 *
 * One exception: `default.events.hero-eyebrow` is left out. design.md bans
 * eyebrow labels ("No uppercase tracking labels anywhere … the heading
 * carries the weight"), so the page never renders it and the editor must
 * not offer a field that does nothing (same call as olive).
 *
 * The page components are NOT re-exported here (circular-import guard): the
 * registry imports them from their own files.
 */
export const DREAM_EVENTS_OMITTED_KEYS = new Set([
  "default.events.hero-eyebrow",
]);

export const dreamEventsData: TemplateField[] = defaultEventsData.filter(
  (field) => !DREAM_EVENTS_OMITTED_KEYS.has(field.key),
);

export const dreamEventsFieldGroups: TemplateFieldGroup[] =
  defaultEventsFieldGroups;

/** Mirrors `default/sections.ts` (same ids, titles and hideability). */
export const dreamEventsSections: TemplateSection[] = [
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
