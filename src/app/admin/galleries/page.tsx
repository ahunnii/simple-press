import Link from "next/link";
import { Plus } from "lucide-react";

import type { FilterDefFor } from "../_components/admin-filters";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  GALLERY_LAYOUT_FILTER_DEFAULT,
  GALLERY_LAYOUT_FILTER_VALUES,
  GALLERY_SORT_DEFAULT,
  GALLERY_SORT_VALUES,
} from "~/lib/validators/gallery";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

import { TrailHeader } from "../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../_lib/table-query";
import { GalleriesList } from "./_components/galleries-list";

type Props = {
  searchParams: Promise<{
    search?: string;
    layout?: string;
    sort?: string;
    page?: string;
  }>;
};

/** 12, not the platform's 25: this page renders CARDS in a 2/3-column grid,
 *  not rows. 12 divides evenly into both widths (6 rows of 2, 4 rows of 3)
 *  so full pages never end on a ragged row, and 25 cards is two-plus screens
 *  of scrolling. Stated deviation per docs/admin-table-migration.md §2. */
const PAGE_SIZE = 12;

const LAYOUT_FILTER: FilterDefFor<typeof GALLERY_LAYOUT_FILTER_VALUES> = {
  key: "layout",
  label: "Layout",
  defaultValue: GALLERY_LAYOUT_FILTER_DEFAULT,
  options: [
    { value: "all", label: "All layouts" },
    { value: "grid", label: "Grid" },
    { value: "masonry", label: "Masonry" },
    { value: "carousel", label: "Carousel" },
    { value: "collage", label: "Collage" },
    { value: "justified", label: "Justified" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof GALLERY_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: GALLERY_SORT_DEFAULT,
  options: [
    { value: "recently-updated", label: "Recently updated" },
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
    { value: "most-images", label: "Most images" },
    { value: "fewest-images", label: "Fewest images" },
  ],
};

export default async function GalleriesPage({ searchParams }: Props) {
  // No feature gate here and no `requireAdminAccess()` call — nothing on this
  // page is role-gated (no bulk delete; per-row delete stays
  // `ownerAdminProcedure`, open to MANAGERs, same as today). `layout.tsx`
  // already gates this whole subtree with `flags.isEnabled("galleries")`.
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const layout = pickParam(
    params.layout,
    GALLERY_LAYOUT_FILTER_VALUES,
    GALLERY_LAYOUT_FILTER_DEFAULT,
  );
  const sort = pickParam(
    params.sort,
    GALLERY_SORT_VALUES,
    GALLERY_SORT_DEFAULT,
  );

  const [galleries, usage] = await Promise.all([
    api.gallery.list().catch(rethrowTrpcForErrorBoundary),
    api.gallery.usage().catch(rethrowTrpcForErrorBoundary),
  ]);

  // `gallery.list` intentionally stays input-free/untrimmed — it has two
  // other callers (the template-field gallery picker and the TipTap gallery
  // node view) that both want the unfiltered list — so the narrowing
  // happens here instead.
  const all = galleries ?? [];

  // Search covers name, slug and description — the same three fields
  // Collections searches. The slug because it's the generated identifier
  // owners recognize; the description because the card renders it.
  const matching = all.filter((gallery) => {
    const matchesSearch = matchesAllTokens(search, [
      gallery.name,
      gallery.slug,
      gallery.description,
    ]);
    const matchesLayout = layout === "all" || gallery.layout === layout;
    return matchesSearch && matchesLayout;
  });

  // Primary ordering only — `buildTablePage` appends the `id` tie-break.
  const { pageItems, totalCount, totalPages, page } = buildTablePage(matching, {
    pageParam: params.page,
    pageSize: PAGE_SIZE,
    comparePrimary: (a, b) => {
      switch (sort) {
        case "newest":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "oldest":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "most-images":
          return (
            b._count.images - a._count.images || a.name.localeCompare(b.name)
          );
        case "fewest-images":
          return (
            a._count.images - b._count.images || a.name.localeCompare(b.name)
          );
        case "recently-updated":
        default: // must match GALLERY_SORT_DEFAULT
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    },
  });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Galleries" }]} />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Galleries</h1>
            <p>Create and manage image galleries</p>
          </div>
          <Button asChild>
            <Link href="/admin/galleries/new">
              <Plus className="mr-2 h-4 w-4" />
              New Gallery
            </Link>
          </Button>
        </div>

        <GalleriesList
          galleries={pageItems}
          usage={usage ?? {}}
          totalGalleries={all.length}
          totalCount={totalCount}
          totalPages={totalPages}
          page={page}
          pageSize={PAGE_SIZE}
          filters={[LAYOUT_FILTER, SORT_FILTER]}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Galleries",
};
