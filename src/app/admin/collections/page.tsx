import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { buildTablePage, pickParam } from "../_lib/table-query";
import { CollectionsClient } from "./_components/collections-client";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

/** Rows per page. Was 12 (a leftover from the old card grid) — at 12 a 13-item
 *  store paginates for the sake of one extra row. */
const PAGE_SIZE = 25;

const VALID_STATUS = ["all", "published", "draft"] as const;
const VALID_SORT = [
  "storefront",
  "name-asc",
  "name-desc",
  "newest",
  "oldest",
  "products-desc",
  "products-asc",
] as const;

type ValidStatus = (typeof VALID_STATUS)[number];
type ValidSort = (typeof VALID_SORT)[number];

const DEFAULT_STATUS: ValidStatus = "all";
const DEFAULT_SORT: ValidSort = "storefront";

export default async function AdminCollectionsPage({ searchParams }: Props) {
  // No feature gate here — `layout.tsx` already gates this whole subtree with
  // the identical `flags.isEnabled("collections")` check.
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const status = pickParam(params.status, VALID_STATUS, DEFAULT_STATUS);
  const sort = pickParam(params.sort, VALID_SORT, DEFAULT_SORT);

  const collections = await api.collections
    .getAll()
    .catch(rethrowTrpcForErrorBoundary);

  const all = collections ?? [];

  // `getAll` intentionally stays unpaginated — three other call sites depend on
  // its current signature — so the narrowing happens here instead.
  // Search covers name, slug and description — the same three Services searches.
  // The slug because a collection is URL-addressable (/collections/<slug>) and
  // generated rather than typed, so the URL is a real way an owner arrives here;
  // the description because the table RENDERS it under the name, and text a
  // person can read in a row but not search for is a dead end. `description` is
  // nullable; `?? false` keeps a null out of the predicate.
  const needle = search.toLowerCase();
  const matching = all.filter((collection) => {
    const matchesSearch =
      needle === "" ||
      collection.name.toLowerCase().includes(needle) ||
      collection.slug.toLowerCase().includes(needle) ||
      (collection.description?.toLowerCase().includes(needle) ?? false);
    const matchesStatus =
      status === "all" ||
      (status === "published" && collection.published) ||
      (status === "draft" && !collection.published);
    return matchesSearch && matchesStatus;
  });

  // Primary ordering only — `buildTablePage` appends the `id` tie-break that
  // keeps pagination stable, and its doc explains why every branch needs one.
  // `storefront` is the case that most needs it: `sortOrder` duplicates are
  // routine, and it is the DEFAULT sort.
  const { pageItems, matchingIds, totalCount, totalPages, page } =
    buildTablePage(matching, {
      pageParam: params.page,
      pageSize: PAGE_SIZE,
      comparePrimary: (a, b) => {
        switch (sort) {
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "name-desc":
            return b.name.localeCompare(a.name);
          case "newest":
            return b.createdAt.getTime() - a.createdAt.getTime();
          case "oldest":
            return a.createdAt.getTime() - b.createdAt.getTime();
          case "products-desc":
            return (
              b._count.collectionProducts - a._count.collectionProducts ||
              a.name.localeCompare(b.name)
            );
          case "products-asc":
            return (
              a._count.collectionProducts - b._count.collectionProducts ||
              a.name.localeCompare(b.name)
            );
          case "storefront":
          default:
            // The storefront's own display order (Collection.sortOrder), which
            // is otherwise invisible and unexplained in admin.
            return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
        }
      },
    });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Collections" }]} />
      <CollectionsClient
        collections={pageItems}
        matchingIds={matchingIds}
        totalCollections={all.length}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}

export const metadata = {
  title: "Collections",
};
