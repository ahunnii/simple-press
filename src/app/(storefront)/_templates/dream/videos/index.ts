import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultVideosData,
  defaultVideosFieldGroups,
} from "../../default/videos";

/**
 * Videos (`/videos`) field registry for dream — Default's `default.videos.*`
 * keys, declared verbatim so dream's editor lists them (the page reads them
 * through Default's resolver). `default.videos.hero-eyebrow` is left out:
 * design.md bans eyebrow labels, so it would be a field that does nothing.
 * See `events/index.ts`.
 *
 * The page component is NOT re-exported here (circular-import guard).
 */
export const DREAM_VIDEOS_OMITTED_KEYS = new Set([
  "default.videos.hero-eyebrow",
]);

export const dreamVideosData: TemplateField[] = defaultVideosData.filter(
  (field) => !DREAM_VIDEOS_OMITTED_KEYS.has(field.key),
);

export const dreamVideosFieldGroups: TemplateFieldGroup[] =
  defaultVideosFieldGroups;

/** Mirrors `default/sections.ts`. */
export const dreamVideosSections: TemplateSection[] = [
  {
    id: "videos.hero",
    page: "videos",
    title: "Hero",
    description: "Page heading and intro text",
    groupIds: ["videos.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "videos.list",
    page: "videos",
    title: "List",
    description: "Video grid and empty-state copy",
    groupIds: ["videos.list"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.videos],
  },
];
