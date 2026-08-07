import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
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
  const status: ValidStatus = VALID_STATUS.includes(
    params.status as ValidStatus,
  )
    ? (params.status as ValidStatus)
    : DEFAULT_STATUS;
  const sort: ValidSort = VALID_SORT.includes(params.sort as ValidSort)
    ? (params.sort as ValidSort)
    : DEFAULT_SORT;
  const requestedPage = Number.parseInt(params.page ?? "", 10);
  const rawPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const collections = await api.collections
    .getAll()
    .catch(rethrowTrpcForErrorBoundary);

  const all = collections ?? [];

  // `getAll` intentionally stays unpaginated — three other call sites depend on
  // its current signature — so the narrowing happens here instead.
  const needle = search.toLowerCase();
  const matching = all.filter((collection) => {
    const matchesSearch =
      needle === "" || collection.name.toLowerCase().includes(needle);
    const matchesStatus =
      status === "all" ||
      (status === "published" && collection.published) ||
      (status === "draft" && !collection.published);
    return matchesSearch && matchesStatus;
  });

  const sorted = [...matching].sort((a, b) => {
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
        // The storefront's own display order (Collection.sortOrder), which is
        // otherwise invisible and unexplained in admin.
        return a.sortOrder - b.sortOrder;
    }
  });

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // Clamp: a stale/hand-typed `?page=` past the end must show the last page
  // rather than an empty table.
  const page = Math.min(rawPage, totalPages);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Collections" }]} />
      <CollectionsClient
        collections={pageItems}
        // Ids of every row matching the current filters, across all pages —
        // feeds the bulk bar's "select all N matching" escalation.
        matchingIds={sorted.map((collection) => collection.id)}
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
