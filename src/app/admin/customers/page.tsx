import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Users } from "lucide-react";

import type { FilterDefFor } from "../_components/admin-filters";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  CUSTOMER_MARKETING_DEFAULT as MARKETING_DEFAULT,
  CUSTOMER_MARKETING_VALUES as MARKETING_VALUES,
  CUSTOMER_PRIVACY_DEFAULT as PRIVACY_DEFAULT,
  CUSTOMER_PRIVACY_VALUES as PRIVACY_VALUES,
  CUSTOMER_SORT_DEFAULT as SORT_DEFAULT,
  CUSTOMER_SORT_VALUES as SORT_VALUES,
} from "~/lib/validators/customer";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { AdminEmpty } from "../_components/admin-empty";
import { AdminFilters } from "../_components/admin-filters";
import { AdminPagination } from "../_components/admin-pagination";
import { TrailHeader } from "../_components/trail-header";
import {
  canonicalPageHref,
  parsePageParam,
  pickParam,
} from "../_lib/table-query";
import { CustomersTable } from "./_components/customers-table";

type Props = {
  searchParams: Promise<{
    search?: string;
    marketing?: string;
    privacy?: string;
    sort?: string;
    page?: string;
  }>;
};

const BASE_PATH = "/admin/customers";
const ITEM_NOUN = { one: "customer", many: "customers" } as const;

// `FilterDefFor` — the mapped-tuple `AdminFilterDef` that makes a UI option the
// router wouldn't accept a type error — now lives in ../_components/admin-filters,
// where Products uses it too. Its doc explains both directions of the check.
//
// The tuples and defaults are imported, not restated: they are the SAME
// contract the router validates with, and the two ways a local copy drifts from
// it — a crash and a silently inert control — are documented at the source.
// A `defaultValue` matching the router's is also what keeps the URL clean:
// `AdminFilters` DELETES a param set back to its default rather than writing
// `?marketing=all`.
const MARKETING_FILTER: FilterDefFor<typeof MARKETING_VALUES> = {
  key: "marketing",
  label: "Marketing",
  defaultValue: MARKETING_DEFAULT,
  options: [
    { value: "all", label: "All customers" },
    { value: "yes", label: "Accepts marketing" },
    { value: "no", label: "Doesn't accept" },
  ],
};

const PRIVACY_FILTER: FilterDefFor<typeof PRIVACY_VALUES> = {
  key: "privacy",
  label: "Privacy",
  defaultValue: PRIVACY_DEFAULT,
  options: [
    { value: "all", label: "All customers" },
    { value: "deletion-requested", label: "Deletion requested" },
    { value: "anonymized", label: "Anonymized" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: SORT_DEFAULT,
  options: [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
    { value: "orders-desc", label: "Most orders" },
    { value: "spent-desc", label: "Highest spend" },
  ],
};

export default async function CustomersPage({ searchParams }: Props) {
  const params = await searchParams;

  // Whitelist everything going in. `pickParam` falls back rather than throwing,
  // so a stale bookmark or a hand-typed `?sort=bogus` renders the default view;
  // `parsePageParam` does the same for `?page=abc`, which the old
  // `Math.max(1, parseInt(...))` turned into NaN and handed to the router's
  // `.int().positive()` validator — a 500 for a typo'd URL.
  const search = params.search?.trim() ?? "";
  const marketing = pickParam(
    params.marketing,
    MARKETING_VALUES,
    MARKETING_DEFAULT,
  );
  const privacy = pickParam(params.privacy, PRIVACY_VALUES, PRIVACY_DEFAULT);
  const sort = pickParam(params.sort, SORT_VALUES, SORT_DEFAULT);

  // The router filters, sorts, counts and paginates in Postgres, and clamps an
  // out-of-range page itself — so `page`, `totalPages` and `pageSize` below are
  // all taken from the result rather than recomputed here.
  const result = await api.customer
    .list({
      search: search || undefined,
      marketing,
      privacy,
      sort,
      page: parsePageParam(params.page),
    })
    .catch(rethrowTrpcForErrorBoundary);

  // Put the URL back in step with what was rendered when the router clamped the
  // page — see `canonicalPageHref`. Before the render, because `redirect` throws.
  const canonicalHref = canonicalPageHref(BASE_PATH, params, result.page);
  if (canonicalHref) redirect(canonicalHref);

  const { customers, totalCount, stats } = result;

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Customers" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Customers</h1>
            <p>View and search your customer list</p>
          </div>
        </div>

        {/* Always rendered. Both figures are business-wide totals that don't
            move with the filters, so they stay meaningful while a filter is on
            — which is the point of showing them. (They used to be hidden
            whenever a search was active, because they were computed over the
            filtered set and would otherwise have just restated the row count
            immediately below them.) */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Customers</CardDescription>
              <CardTitle className="text-3xl">{stats.totalCustomers}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>
                All customers accepting marketing
              </CardDescription>
              <CardTitle className="text-3xl">{stats.marketingCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {stats.totalCustomers === 0 ? (
          // Gated on the UNFILTERED business-wide total, never on `totalCount`:
          // a search matching nothing reports zero matches, and gating on that
          // would tell a 400-customer store it has no customers at all. There's
          // also no action button here — unlike products, an owner cannot
          // create a customer; they arrive on their own — and no filter bar,
          // because there is nothing to filter.
          <AdminEmpty
            icon={Users}
            title="No customers yet"
            description="Customers appear here after their first order, or when someone creates an account on your storefront."
          />
        ) : (
          <>
            <AdminFilters
              basePath={BASE_PATH}
              searchPlaceholder="Search customers…"
              // Names the fields actually matched — the placeholder has no room,
              // and a bare "Search customers" leaves a screen-reader user
              // guessing whether an email address will hit. `list` ORs over
              // email, first name and last name, so all three are named.
              searchAriaLabel="Search customers by name or email"
              filters={[MARKETING_FILTER, PRIVACY_FILTER, SORT_FILTER]}
              resultCount={totalCount}
              itemNoun={ITEM_NOUN}
            />

            {customers.length === 0 ? (
              <AdminEmpty
                icon={Search}
                title="No customers match your filters"
                // AdminEmpty renders its own "Try adjusting your search or
                // filters." line when `filtered` — don't say it twice.
                filtered
                action={
                  <Button variant="outline" asChild>
                    <Link href={BASE_PATH}>Clear filters</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <CustomersTable customers={customers} />
                <AdminPagination
                  page={result.page}
                  totalPages={result.totalPages}
                  totalCount={totalCount}
                  // The router owns the page size and returns it; restating it
                  // as a local literal is how the "Showing X–Y of Z" readout
                  // starts quietly lying once the two drift.
                  pageSize={result.pageSize}
                  basePath={BASE_PATH}
                  itemNoun={ITEM_NOUN}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Customers",
};
