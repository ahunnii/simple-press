import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultEventsData,
  defaultEventsFieldGroups,
} from "../../default/events";

/**
 * Events (`/events`, `/events/<slug>`) field registry for umsc — parity PF23
 * (package TP7, docs/templates/umsc/parity-plan-2026-09-28.md).
 *
 * umsc's events pages keep reading Default's `default.events.*` keys through
 * Default's resolver (umsc rendered Default's events pages until 2026-09-28,
 * so any saved copy carries over untouched; only Default's field map knows
 * their `defaultValue`s), so the fields are declared here verbatim — that is
 * what gives them a panel in umsc's editor (the pollen round-2 trap).
 *
 * One exception, as olive: `default.events.hero-eyebrow` is left out —
 * umsc has no eyebrow/kicker labels by design (design.md "Typography"), so
 * the pages don't render it and the editor must not offer a dead field.
 *
 * The page components are NOT re-exported here (circular-import guard).
 */
export const UMSC_EVENTS_OMITTED_KEYS = new Set([
  "default.events.hero-eyebrow",
]);

export const umscEventsData: TemplateField[] = defaultEventsData.filter(
  (field) => !UMSC_EVENTS_OMITTED_KEYS.has(field.key),
);

export const umscEventsFieldGroups: TemplateFieldGroup[] =
  defaultEventsFieldGroups;

/** Mirrors `default/sections.ts` (same ids, titles and hideability). */
export const umscEventsSections: TemplateSection[] = [
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
