import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultVideosData,
  defaultVideosFieldGroups,
} from "../../default/videos";

/**
 * Videos (`/videos`) field registry for noise — Default's `default.videos.*`
 * keys, declared verbatim so noise's editor lists them (the page reads them
 * through Default's resolver). The eyebrow key stays: it renders as the
 * title band's mono overline. See `events/index.ts`.
 *
 * The page component is NOT re-exported here (circular-import guard).
 */
export const noiseVideosData: TemplateField[] = defaultVideosData;

export const noiseVideosFieldGroups: TemplateFieldGroup[] =
  defaultVideosFieldGroups;

/** Mirrors `default/sections.ts`. */
export const noiseVideosSections: TemplateSection[] = [
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
