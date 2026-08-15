import type { FilterDefFor } from "../_components/admin-filters";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
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
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../_lib/table-query";
import { MediaLibraryClient } from "./_components/media-library-client";

type Props = {
  searchParams: Promise<{
    /** Platform-admin-only: view another business's library. Honoured by the
     *  router only for PLATFORM_ADMIN callers (see `resolveTarget`). */
    businessId?: string;
    search?: string;
    type?: string;
    used?: string;
    sort?: string;
    page?: string;
  }>;
};

/** 24, not the platform's 25: this page renders CARDS in a 2/3/4-column grid,
 *  not rows. Media cards are denser than the Galleries cards (a thumbnail, one
 *  filename line, one meta line — no description, no mosaic), so the grid runs
 *  up to 4-across at xl and a page of 25 would end on a ragged single-card row
 *  at every width. 24 divides evenly into 2, 3 AND 4 columns, so a full page
 *  never ends ragged. Stated deviation per docs/admin-table-migration.md §2. */
const PAGE_SIZE = 24;

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

export default async function MediaLibraryPage({ searchParams }: Props) {
  // `layout.tsx` already gates this whole subtree with `flags.isEnabled("media")`,
  // so no feature check here. `requireAdminAccess()` runs again purely for the
  // resolved membership role — `media.bulkDelete` is `ownerOnlyProcedure`, and
  // the client OMITS the bulk affordances entirely when this is false.
  const { session, membershipRole } = await requireAdminAccess();
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const type = pickParam(params.type, MEDIA_TYPE_VALUES, MEDIA_TYPE_DEFAULT);
  const used = pickParam(params.used, MEDIA_USAGE_VALUES, MEDIA_USAGE_DEFAULT);
  const sort = pickParam(params.sort, MEDIA_SORT_VALUES, MEDIA_SORT_DEFAULT);

  const data = await api.media
    .list({ businessId: params.businessId })
    .catch(rethrowTrpcForErrorBoundary);

  // `media.list` returns the whole S3 listing for the business — filtering,
  // sorting and paging all happen here (in-memory pipeline, §3a). `id` is the
  // S3 key: `buildTablePage` requires `{ id: string }` for its tie-break, and
  // keys are unique within a bucket by definition. `filename` is precomputed
  // once per row so the two name sorts don't re-split the key on every compare.
  const rows = data.items.map((item) => ({
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
      pageSize: PAGE_SIZE,
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

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Media Library" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Media Library</h1>
            <p>Browse, download, and manage your uploaded media files</p>
          </div>
        </div>

        {params.businessId && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <strong>Platform Admin View:</strong> Viewing media for business{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900">
              {data.businessId}
            </code>
          </div>
        )}

        <MediaLibraryClient
          items={pageItems}
          businessId={data.businessId}
          canBulkDelete={canBulkDelete}
          matchingIds={matchingIds}
          totalCount={totalCount}
          totalPages={totalPages}
          page={page}
          pageSize={PAGE_SIZE}
          // Unfiltered total — the empty-state gate. `totalCount` would tell a
          // 400-file library it has none the moment a search matches nothing.
          totalFiles={rows.length}
          filters={[TYPE_FILTER, USAGE_FILTER, SORT_FILTER]}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Media Library",
};
