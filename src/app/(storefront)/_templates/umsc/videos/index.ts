import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  defaultVideosData,
  defaultVideosFieldGroups,
} from "../../default/videos";
import { umscHeroPhotoFields } from "../shared/umsc-hero-fields";

/**
 * Videos (`/videos`) field registry for umsc — parity PF23 (package TP7).
 * Default's `default.videos.*` keys, declared verbatim so umsc's editor lists
 * them (the page reads them through Default's resolver; umsc rendered
 * Default's videos page until 2026-09-28). `default.videos.hero-eyebrow` is
 * left out — umsc has no eyebrow labels by design. See `events/index.ts`,
 * including umsc's own optional band photo (`umsc.videos.hero-*`).
 *
 * The page component is NOT re-exported here (circular-import guard).
 */
export const UMSC_VIDEOS_OMITTED_KEYS = new Set([
  "default.videos.hero-eyebrow",
]);

export const umscVideosData: TemplateField[] = [
  ...defaultVideosData.filter(
    (field) => !UMSC_VIDEOS_OMITTED_KEYS.has(field.key),
  ),
  ...umscHeroPhotoFields("videos", "videos.hero"),
];

export const umscVideosFieldGroups: TemplateFieldGroup[] =
  defaultVideosFieldGroups.map((group) =>
    group.id === "videos.hero"
      ? {
          ...group,
          description: "Page heading, intro text and optional photo.",
        }
      : group,
  );

/** Mirrors `default/sections.ts`. */
export const umscVideosSections: TemplateSection[] = [
  {
    id: "videos.hero",
    page: "videos",
    title: "Hero",
    description: "Page heading, intro text and optional photo",
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
