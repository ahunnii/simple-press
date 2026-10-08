import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultVideosData,
  defaultVideosFieldGroups,
} from "../../default/videos";

/**
 * Glove's Videos page renders Default's `default.videos.*` copy (read through
 * Default's resolver) on glove's generic base. Re-exported so glove's editor
 * lists the fields, plus the matching section curation.
 */
export const gloveVideosData = defaultVideosData;
export const gloveVideosFieldGroups = defaultVideosFieldGroups;

export const gloveVideosSections: TemplateSection[] = [
  {
    id: "videos.hero",
    page: "videos",
    title: "Hero",
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
