import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultEventsData,
  defaultEventsFieldGroups,
} from "../../default/events";

/**
 * Events (`/events`, `/events/<slug>`) field registry for noise — parity
 * PF12 (package TP5, docs/templates/noise/parity-plan-2026-09-28.md).
 *
 * noise's events pages keep reading Default's `default.events.*` keys
 * through Default's resolver (owner-saved copy carries over untouched, and
 * only Default's field map knows their `defaultValue`s), so the fields are
 * declared here verbatim — that is what gives them a panel in noise's
 * editor. Unlike olive, noise keeps `default.events.hero-eyebrow`: its title
 * band leads with a mono overline, so the field renders there.
 *
 * The page components are NOT re-exported here (circular-import guard): the
 * registry imports them from their own files.
 */
export const noiseEventsData: TemplateField[] = defaultEventsData;

export const noiseEventsFieldGroups: TemplateFieldGroup[] =
  defaultEventsFieldGroups;

/** Mirrors `default/sections.ts` (same ids, titles and hideability). */
export const noiseEventsSections: TemplateSection[] = [
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
