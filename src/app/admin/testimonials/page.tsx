import { notFound } from "next/navigation";

import type { FilterDefFor } from "../_components/admin-filters";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  getInviteStatus,
  getTestimonialStatus,
  INVITE_STATUS_DEFAULT,
  INVITE_STATUS_VALUES,
  TESTIMONIAL_SORT_DEFAULT,
  TESTIMONIAL_SORT_VALUES,
  TESTIMONIAL_SOURCE_DEFAULT,
  TESTIMONIAL_SOURCE_VALUES,
  TESTIMONIAL_STATUS_DEFAULT,
  TESTIMONIAL_STATUS_VALUES,
} from "~/lib/validators/testimonials";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../_lib/table-query";
import { TestimonialSettings } from "./_components/testimonial-settings";
import { TestimonialsActions } from "./_components/testimonials-actions";
import { TestimonialsClient } from "./_components/testimonials-client";
import { TestimonialsInvites } from "./_components/testimonials-invites";
import { TestimonialsTabs } from "./_components/testimonials-tabs";

type Props = {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    status?: string;
    source?: string;
    sort?: string;
    page?: string;
    invites?: string;
  }>;
};

/** Rows per page — the platform standard (docs/admin-table-migration.md §2), up from 20. */
const PAGE_SIZE = 25;

// Local to this page — the tab switch is a plain link nav, not a shared
// filter tuple another page whitelists against.
const TAB_VALUES = ["testimonials", "invites"] as const;

// Same shape as Discounts/Products: pinned to the validator tuples so a UI
// option with no matching value (or vice versa) is a type error, not a
// silent drift. Menu order = tuple order.
const STATUS_FILTER: FilterDefFor<typeof TESTIMONIAL_STATUS_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: TESTIMONIAL_STATUS_DEFAULT,
  options: [
    { value: "all", label: "All testimonials" },
    { value: "pending", label: "Pending" },
    { value: "published", label: "Published" },
    { value: "hidden", label: "Hidden" },
  ],
};

const SOURCE_FILTER: FilterDefFor<typeof TESTIMONIAL_SOURCE_VALUES> = {
  key: "source",
  label: "Source",
  defaultValue: TESTIMONIAL_SOURCE_DEFAULT,
  options: [
    { value: "all", label: "All sources" },
    { value: "customer", label: "Customer submitted" },
    { value: "owner", label: "Owner added" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof TESTIMONIAL_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: TESTIMONIAL_SORT_DEFAULT,
  options: [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
  ],
};

// Same pinned-tuple shape as STATUS_FILTER above, for the invites tab's own
// namespaced `?invites=` param.
const INVITE_STATUS_FILTER: FilterDefFor<typeof INVITE_STATUS_VALUES> = {
  key: "invites",
  label: "Status",
  defaultValue: INVITE_STATUS_DEFAULT,
  options: [
    { value: "all", label: "All invites" },
    { value: "completed", label: "Completed" },
    { value: "pending", label: "Pending" },
    { value: "expired", label: "Expired" },
  ],
};

export default async function TestimonialsPage({ searchParams }: Props) {
  // No feature-gate check here — `layout.tsx` already gates this whole
  // subtree with the identical `flags.isEnabled("testimonials")` check.
  const params = await searchParams;

  // Same guard `/admin/layout.tsx` already ran, called again for its
  // resolved `membershipRole` — which is what decides whether the bulk bar
  // may offer Delete at all.
  const { session, membershipRole } = await requireAdminAccess();
  // Mirrors `ownerOnlyProcedure`, which `testimonial.bulkDelete` uses:
  // PLATFORM_ADMIN bypasses the membership check, everyone else needs OWNER.
  // The procedure is still the enforcement — this only stops the UI offering
  // what it will refuse.
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  const tab = pickParam(params.tab, TAB_VALUES, "testimonials");

  // Both tabs' counts feed the tab nav regardless of which tab is active, so
  // both datasets are always fetched together. `business` feeds the
  // auto-approve toggle below — same `getWith({})` call the Features page
  // used before this control moved here.
  const [allTestimonials, allInvites, business] = await Promise.all([
    api.testimonial
      .list({ publicOnly: false })
      .catch(rethrowTrpcForErrorBoundary),
    api.testimonial.listInvites().catch(rethrowTrpcForErrorBoundary),
    api.business.getWith({}),
  ]);
  if (!business) notFound();

  const now = new Date();

  // Single derivation site: the filter predicate below, the client's status
  // badge, and the tab nav's pending count all read `row.status` — the
  // client never calls `new Date()` or re-derives status itself.
  const rows = allTestimonials.map((testimonial) => ({
    ...testimonial,
    status: getTestimonialStatus(testimonial),
  }));
  const inviteRows = allInvites.map((invite) => ({
    ...invite,
    status: getInviteStatus(invite, now),
  }));
  const pendingCount = rows.filter((row) => row.status === "pending").length;

  // ── Testimonials tab pipeline ─────────────────────────────────────────────
  const search = params.search?.trim() ?? "";
  const status = pickParam(
    params.status,
    TESTIMONIAL_STATUS_VALUES,
    TESTIMONIAL_STATUS_DEFAULT,
  );
  const source = pickParam(
    params.source,
    TESTIMONIAL_SOURCE_VALUES,
    TESTIMONIAL_SOURCE_DEFAULT,
  );
  const sort = pickParam(
    params.sort,
    TESTIMONIAL_SORT_VALUES,
    TESTIMONIAL_SORT_DEFAULT,
  );

  const matching = rows.filter((row) => {
    const matchesSearch = matchesAllTokens(search, [
      row.customerName,
      row.customerEmail,
      row.text,
      row.title,
      row.customerTitle,
      row.customerCompany,
    ]);
    const matchesStatus = status === "all" || row.status === status;
    const matchesSource = source === "all" || row.source === source;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const { pageItems, matchingIds, totalCount, totalPages, page } =
    buildTablePage(matching, {
      pageParam: params.page,
      pageSize: PAGE_SIZE,
      comparePrimary: (a, b) => {
        switch (sort) {
          case "oldest":
            return a.testimonialDate.getTime() - b.testimonialDate.getTime();
          case "name-asc":
            return a.customerName.localeCompare(b.customerName);
          case "name-desc":
            return b.customerName.localeCompare(a.customerName);
          case "newest":
          default:
            return b.testimonialDate.getTime() - a.testimonialDate.getTime();
        }
      },
    });

  // ── Invites tab pipeline ──────────────────────────────────────────────────
  const inviteFilter = pickParam(
    params.invites,
    INVITE_STATUS_VALUES,
    INVITE_STATUS_DEFAULT,
  );
  // Reusing `?search=` is safe here even though the testimonials tab also
  // owns it: the two tabs unmount each other (only one renders per request),
  // and both `AdminFilters.buildParams` and `AdminPagination.hrefFor` copy
  // every current param — including `tab=invites` — into their nav targets,
  // so switching tabs always starts from a clean URL rather than carrying a
  // stale search term across.
  const inviteSearch = params.search?.trim() ?? "";
  const matchingInvites = inviteRows.filter((invite) => {
    const matchesSearch = matchesAllTokens(inviteSearch, [
      invite.email,
      invite.customer?.firstName,
      invite.customer?.lastName,
    ]);
    return (
      matchesSearch &&
      (inviteFilter === "all" || invite.status === inviteFilter)
    );
  });
  const invitePage = buildTablePage(matchingInvites, {
    pageParam: params.page,
    pageSize: PAGE_SIZE,
    comparePrimary: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    // Fixed newest-first (matches listInvites' orderBy); no sort control —
    // selective adoption, same as the no-selection/no-bulk-bar calls below.
  });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Testimonials" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Testimonials</h1>
            <p>Manage customer testimonials</p>
          </div>
          <TestimonialsActions />
        </div>

        <TestimonialSettings
          testimonialsAutoApprove={business.testimonialsAutoApprove}
        />

        <TestimonialsTabs
          active={tab}
          testimonialCount={rows.length}
          pendingCount={pendingCount}
          inviteCount={inviteRows.length}
        />

        {tab === "testimonials" ? (
          <TestimonialsClient
            testimonials={pageItems}
            filters={[STATUS_FILTER, SOURCE_FILTER, SORT_FILTER]}
            matchingIds={matchingIds}
            totalTestimonials={rows.length}
            totalCount={totalCount}
            totalPages={totalPages}
            page={page}
            pageSize={PAGE_SIZE}
            canBulkDelete={canBulkDelete}
          />
        ) : (
          <TestimonialsInvites
            invites={invitePage.pageItems}
            filters={[INVITE_STATUS_FILTER]}
            totalInvites={inviteRows.length}
            totalCount={invitePage.totalCount}
            totalPages={invitePage.totalPages}
            page={invitePage.page}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Testimonials",
};
