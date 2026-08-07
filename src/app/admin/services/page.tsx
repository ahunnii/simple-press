import { requireAdminAccess } from "~/lib/require-admin-access";
import { SERVICE_TEMPLATE_META } from "~/lib/service-templates";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { buildTablePage, matchesAllTokens, pickParam } from "../_lib/table-query";
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
// Owners cannot reorder services (only service ITEMS within one), so there is
// no "Storefront order" sort here to default to — Newest is what every other
// admin table without a controllable order defaults to.
const DEFAULT_SORT: ValidSort = "newest";

export default async function AdminServicesPage({ searchParams }: Props) {
  // No feature gate here — `layout.tsx` already gates this whole subtree with
  // the identical `flags.isEnabled("services")` check.
  const params = await searchParams;
  // Same guard `/admin/layout.tsx` already ran, called again for its resolved
  // `membershipRole` — which is what decides whether the bulk bar may offer
  // Delete at all.
  const { session, membershipRole } = await requireAdminAccess();
  // Mirrors `ownerOnlyProcedure`, which `services.bulkDelete` uses:
  // PLATFORM_ADMIN bypasses the membership check, everyone else needs OWNER.
  // The procedure is still the enforcement — this only stops the UI offering
  // what it will refuse.
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

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
  // Tokenized via `matchesAllTokens` so a multi-word query can match across
  // fields rather than needing to appear whole in a single one.
  const matching = all.filter((service) => {
    const matchesSearch = matchesAllTokens(search, [
      service.name,
      service.slug,
      service.description,
    ]);
    const matchesStatus =
      status === "all" ||
      (status === "published" && service.published) ||
      (status === "draft" && !service.published);
    return matchesSearch && matchesStatus;
  });

  // Primary ordering only — `buildTablePage` appends the `id` tie-break that
  // keeps pagination stable, and its doc explains why every branch needs one.
  // No `storefront`/`sortOrder` branch here on purpose: owners cannot reorder
  // services (only service ITEMS within one), so surfacing that column as a
  // sort option implied a control that doesn't exist. `Service.sortOrder`
  // still drives the storefront's own rendering — this only removes it from
  // the admin table's sort control.
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
              b._count.items - a._count.items || a.name.localeCompare(b.name)
            );
          case "items-asc":
            return (
              a._count.items - b._count.items || a.name.localeCompare(b.name)
            );
          case "newest":
          default:
            return b.createdAt.getTime() - a.createdAt.getTime();
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
        canBulkDelete={canBulkDelete}
      />
    </>
  );
}

export const metadata = {
  title: "Services",
};
