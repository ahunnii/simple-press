/**
 * The Media Library's in-memory page pipeline — filter defs plus
 * filter → sort → page over a whole `media.list` / `platformMedia.list`
 * listing. Shared by the shop page (`/admin/media`) and the platform hub page
 * (`/businesses/[businessId]/media`) so the two can never drift on what a
 * filter means or how a page is cut.
 *
 * Pure (no server or client APIs), so it runs in either server page.
 */

import type { MediaRow } from "../_components/media-library-client";
import type { FilterDefFor } from "../../_components/admin-filters";
import type { MediaItem } from "~/components/media/media-grid";
import {
  getMediaSearchFields,
  getMediaUsageStatus,
  MEDIA_SORT_DEFAULT,
  MEDIA_SORT_VALUES,
  MEDIA_TYPE_DEFAULT,
  MEDIA_TYPE_VALUES,
  MEDIA_USAGE_DEFAULT,
  MEDIA_USAGE_VALUES,
} from "~/lib/validators/media";

import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../../_lib/table-query";

/** 24, not the platform's 25: this page renders CARDS in a 2/3/4-column grid,
 *  not rows. Media cards are denser than the Galleries cards (a thumbnail, one
 *  filename line, one meta line — no description, no mosaic), so the grid runs
 *  up to 4-across at xl and a page of 25 would end on a ragged single-card row
 *  at every width. 24 divides evenly into 2, 3 AND 4 columns, so a full page
 *  never ends ragged. Stated deviation per docs/admin-table-migration.md §2. */
export const MEDIA_PAGE_SIZE = 24;

const TYPE_FILTER: FilterDefFor<typeof MEDIA_TYPE_VALUES> = {
  key: "type",
  label: "Type",
  defaultValue: MEDIA_TYPE_DEFAULT,
  options: [
    { value: "all", label: "All Types" },
    { value: "image", label: "Images" },
    { value: "video", label: "Videos" },
    { value: "logo", label: "Logo" },
    { value: "favicon", label: "Favicon" },
    { value: "testimonial", label: "Testimonials" },
    { value: "gallery", label: "Gallery" },
    { value: "other", label: "Other" },
  ],
};

const USAGE_FILTER: FilterDefFor<typeof MEDIA_USAGE_VALUES> = {
  key: "used",
  label: "Usage",
  defaultValue: MEDIA_USAGE_DEFAULT,
  options: [
    { value: "all", label: "All Files" },
    { value: "used", label: "In Use" },
    { value: "inactive", label: "Inactive template only" },
    { value: "unused", label: "Unused" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof MEDIA_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: MEDIA_SORT_DEFAULT,
  options: [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
    { value: "largest", label: "Largest file" },
    { value: "smallest", label: "Smallest file" },
  ],
};

/** Filter dropdowns, in display order. */
export const MEDIA_FILTERS = [TYPE_FILTER, USAGE_FILTER, SORT_FILTER];

/** The URL params the pipeline reads. */
export type MediaPageParams = {
  search?: string;
  type?: string;
  used?: string;
  sort?: string;
  page?: string;
};

/**
 * Filter, sort and page a whole media listing. `grid` is the props
 * `MediaLibraryClient` needs (everything except scope/basePath/permissions);
 * `totalBytes` feeds a storage readout.
 */
export function buildMediaLibraryPage(
  items: readonly MediaItem[],
  params: MediaPageParams,
) {
  const search = params.search?.trim() ?? "";
  const type = pickParam(params.type, MEDIA_TYPE_VALUES, MEDIA_TYPE_DEFAULT);
  const used = pickParam(params.used, MEDIA_USAGE_VALUES, MEDIA_USAGE_DEFAULT);
  const sort = pickParam(params.sort, MEDIA_SORT_VALUES, MEDIA_SORT_DEFAULT);

  // The list procedures return the whole S3 listing for the business —
  // filtering, sorting and paging all happen here (in-memory pipeline, §3a).
  // `id` is the S3 key: `buildTablePage` requires `{ id: string }` for its
  // tie-break, and keys are unique within a bucket by definition. `filename`
  // is precomputed once per row so the two name sorts don't re-split the key
  // on every compare.
  const rows: MediaRow[] = items.map((item) => ({
    ...item,
    id: item.key,
    filename: item.key.split("/").pop() ?? item.key,
    // Precomputed once per row, same reasoning as `filename` — the "used"
    // filter option below and `UsageBadge` on the client both need the same
    // three-bucket classification, so it's derived here rather than
    // recomputed per predicate/render. See `getMediaUsageStatus`.
    usageStatus: getMediaUsageStatus(item.usedBy),
  }));

  const matching = rows.filter((item) => {
    // Search covers the filename, the full key, and every usage's location and
    // entity label — so "hero" finds an image used as a homepage hero even
    // though "hero" never appears in its generated key. See
    // `getMediaSearchFields` in the validators file.
    const matchesSearch = matchesAllTokens(search, getMediaSearchFields(item));
    const matchesType = type === "all" || item.kind === type;
    const matchesUsage = used === "all" || item.usageStatus === used;
    return matchesSearch && matchesType && matchesUsage;
  });

  // Primary ordering only — `buildTablePage` appends the `id` tie-break.
  const { pageItems, matchingIds, totalCount, totalPages, page } =
    buildTablePage(matching, {
      pageParam: params.page,
      pageSize: MEDIA_PAGE_SIZE,
      comparePrimary: (a, b) => {
        switch (sort) {
          case "oldest":
            return a.lastModified.getTime() - b.lastModified.getTime();
          case "name-asc":
            return a.filename.localeCompare(b.filename);
          case "name-desc":
            return b.filename.localeCompare(a.filename);
          // Size ties are common (duplicated uploads, tiny icons), so both size
          // sorts fall back to the filename before the id tie-break — otherwise
          // equal-sized files would order by an opaque hashed key.
          case "largest":
            return b.size - a.size || a.filename.localeCompare(b.filename);
          case "smallest":
            return a.size - b.size || a.filename.localeCompare(b.filename);
          case "newest":
          default: // must match MEDIA_SORT_DEFAULT
            return b.lastModified.getTime() - a.lastModified.getTime();
        }
      },
    });

  return {
    /** Spread straight into `<MediaLibraryClient>`. */
    grid: {
      items: pageItems,
      matchingIds,
      totalCount,
      totalPages,
      page,
      pageSize: MEDIA_PAGE_SIZE,
      // Unfiltered total — the empty-state gate. `totalCount` would tell a
      // 400-file library it has none the moment a search matches nothing.
      totalFiles: rows.length,
      filters: MEDIA_FILTERS,
    },
    /** Sum of every file's size, unfiltered — the hub's storage readout. */
    totalBytes: rows.reduce((sum, row) => sum + row.size, 0),
  };
}
