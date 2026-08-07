import { SERVICE_TEMPLATE_META } from "~/lib/service-templates";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { buildTablePage, pickParam } from "../_lib/table-query";
import { ServicesClient } from "./_components/services-client";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

/** Rows per page. Was 12 (a leftover from the old card grid) — at 12 a 13-item
 *  store paginates for the sake of one extra row. Matches Collections and
 *  Inventory, the density the admin tables settled on. */
const PAGE_SIZE = 25;

const VALID_STATUS = ["all", "published", "draft"] as const;
const VALID_SORT = [
  "storefront",
  "name-asc",
  "name-desc",
  "newest",
  "oldest",
  "items-desc",
  "items-asc",
] as const;

type ValidStatus = (typeof VALID_STATUS)[number];
type ValidSort = (typeof VALID_SORT)[number];

const DEFAULT_STATUS: ValidStatus = "all";
const DEFAULT_SORT: ValidSort = "storefront";

export default async function AdminServicesPage({ searchParams }: Props) {
  // No feature gate here — `layout.tsx` already gates this whole subtree with
  // the identical `flags.isEnabled("services")` check.
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const status = pickParam(params.status, VALID_STATUS, DEFAULT_STATUS);
  const sort = pickParam(params.sort, VALID_SORT, DEFAULT_SORT);

  const services = await api.services
    .getAll()
    .catch(rethrowTrpcForErrorBoundary);

  const all = services ?? [];

  // `getAll` intentionally stays input-free — /admin/content/navigation also
  // calls it and wants every service — so the narrowing happens here instead.
  //
  // Search covers the slug as well as the name: a service is URL-addressable
  // (/services/<slug>) and the slug is generated from the name rather than
  // typed, so "the page at /services/deep-tissue" is a real way an owner
  // arrives here knowing only the URL.
  //
  // The description is searched too, because the table RENDERS it under the
  // name — text a person can read in a row but not search for is a dead end.
  // `description` is nullable; `?? false` keeps a null out of the predicate.
  const needle = search.toLowerCase();
  const matching = all.filter((service) => {
    const matchesSearch =
      needle === "" ||
      service.name.toLowerCase().includes(needle) ||
      service.slug.toLowerCase().includes(needle) ||
      (service.description?.toLowerCase().includes(needle) ?? false);
    const matchesStatus =
      status === "all" ||
      (status === "published" && service.published) ||
      (status === "draft" && !service.published);
    return matchesSearch && matchesStatus;
  });

  // Primary ordering only — `buildTablePage` appends the `id` tie-break that
  // keeps pagination stable, and its doc explains why every branch needs one.
  // `storefront` is the case that most needs it: it is the DEFAULT sort, and
  // `sortOrder` duplicates are routine (every service created before `reorder`
  // was ever run shares whatever the create path assigned).
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
          // Sorts on the TOTAL, not `liveItemCount`. "Most items" has to order
          // by the number the Items column leads with, or the top row of "Most
          // items" can show a smaller figure than the row beneath it — the sort
          // would look broken. The live count is a qualifier on that number,
          // not a competing one, and Collections' products-desc/asc already
          // sorts by its total for the same reason. Finding the services that
          // are empty on the storefront is a filter question, not a sort one —
          // the in-row warning answers it today.
          case "items-desc":
            return (
              b.items.length - a.items.length || a.name.localeCompare(b.name)
            );
          case "items-asc":
            return (
              a.items.length - b.items.length || a.name.localeCompare(b.name)
            );
          case "storefront":
          default:
            // The storefront's own display order (Service.sortOrder), which is
            // otherwise invisible and unexplained in admin.
            return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
        }
      },
    });

  // Resolved here rather than in the client component on purpose:
  // `~/lib/service-templates` imports every storefront's service-page field
  // definitions, and none of that needs to reach the browser to label a badge.
  const templateLabels: Record<string, string> = {};
  for (const service of all) {
    const label = SERVICE_TEMPLATE_META[service.serviceTemplateId]?.label;
    if (label) templateLabels[service.serviceTemplateId] = label;
  }

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Services" }]} />
      <ServicesClient
        services={pageItems}
        matchingIds={matchingIds}
        templateLabels={templateLabels}
        totalServices={all.length}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}

export const metadata = {
  title: "Services",
};
