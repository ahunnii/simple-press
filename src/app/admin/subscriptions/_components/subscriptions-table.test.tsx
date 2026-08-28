import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SubscriptionsTable } from "./subscriptions-table";

// `AdminFilters`/`AdminPagination` (mounted inside the table) read
// `useRouter`/`useSearchParams`/`usePathname` directly — stub the whole
// module so they render without a real Next.js router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/subscriptions",
}));

// The table's own "Sync now" button drives `api.subscription.syncNow`.
// Stubbed inert — these tests only assert on render output, never on the
// mutation firing.
vi.mock("~/trpc/react", () => ({
  api: {
    subscription: {
      syncNow: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    useUtils: () => ({ subscription: { invalidate: vi.fn() } }),
  },
}));

type TableProps = Parameters<typeof SubscriptionsTable>[0];
type Row = TableProps["rows"][number];

/** A fully-populated fake `Subscription` row — only the fields the table
 *  actually reads are meaningful; the rest exist so the type checks out. */
function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "sub_1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    businessId: "biz_1",
    customerId: null,
    customerEmail: "jane@example.com",
    customerName: "Jane Doe",
    customerPhone: null,
    stripeSubscriptionId: "sub_stripe_1",
    stripeCustomerId: "cus_1",
    stripeCheckoutSessionId: null,
    lastInvoiceId: null,
    productId: "prod_1",
    productVariantId: null,
    productName: "Toilet Paper 12-Pack",
    variantName: null,
    sku: null,
    quantity: 2,
    intervalKey: "month:1",
    interval: "month",
    intervalCount: 1,
    listPriceCents: 2000,
    discountPercent: 10,
    unitAmountCents: 1800,
    shippingCents: 500,
    deliveryMethod: "ship",
    shippingAddressId: null,
    shipFirstName: "Jane",
    shipLastName: "Doe",
    shipAddress1: "123 Main St",
    shipAddress2: null,
    shipCity: "Detroit",
    shipProvince: "MI",
    shipZip: "48201",
    shipCountry: "US",
    status: "active",
    pauseResumesAt: null,
    currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
    nextBillingAt: new Date("2026-02-01T00:00:00Z"),
    cancelledAt: null,
    cancelReason: null,
    lastPaymentFailedAt: null,
    lastSyncedAt: null,
    termsAcceptedAt: null,
    termsVersion: null,
    merchantTermsUpdatedAt: null,
    ...overrides,
  } as Row;
}

const EMPTY_SUMMARY = {
  active: 0,
  paused: 0,
  pastDue: 0,
  monthlyRecurringCents: 0,
};

function renderTable(overrides: Partial<TableProps> = {}) {
  return render(
    <SubscriptionsTable
      rows={[]}
      totalCount={0}
      totalPages={1}
      page={1}
      pageSize={25}
      totalSubscriptions={0}
      featureEnabled
      summary={EMPTY_SUMMARY}
      {...overrides}
    />,
  );
}

describe("SubscriptionsTable", () => {
  it("renders a row's customer, product, and status", () => {
    const row = makeRow();
    renderTable({ rows: [row], totalCount: 1, totalSubscriptions: 1 });

    // Scoped to the table itself — the summary strip above it has its own
    // "Active" tile LABEL, which would otherwise collide with the row's
    // status badge VALUE of the same word.
    const table = within(screen.getByRole("table"));
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(table.getByText("Toilet Paper 12-Pack")).toBeInTheDocument();
    expect(table.getByText("Active")).toBeInTheDocument();
  });

  it("shows the human label for every status", () => {
    const rows = [
      makeRow({ id: "1", status: "active" }),
      makeRow({ id: "2", status: "past_due" }),
      makeRow({ id: "3", status: "paused" }),
      makeRow({ id: "4", status: "cancelled" }),
      makeRow({ id: "5", status: "incomplete" }),
    ];
    renderTable({
      rows,
      totalCount: rows.length,
      totalSubscriptions: rows.length,
    });

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Active")).toBeInTheDocument();
    expect(table.getByText("Past due")).toBeInTheDocument();
    expect(table.getByText("Paused")).toBeInTheDocument();
    expect(table.getByText("Cancelled")).toBeInTheDocument();
    expect(table.getByText("Incomplete")).toBeInTheDocument();
  });

  it("shows the cadence label, quantity, and per-delivery total", () => {
    const row = makeRow({
      intervalKey: "month:1",
      quantity: 2,
      unitAmountCents: 1800,
      shippingCents: 500,
      deliveryMethod: "ship",
    });
    renderTable({ rows: [row], totalCount: 1, totalSubscriptions: 1 });

    expect(screen.getByText("Every month")).toBeInTheDocument();
    // Per-delivery = 1800 * 2 + 500 = 4100 cents = $41.00
    expect(screen.getByText("$41.00")).toBeInTheDocument();
  });

  it("shows a full empty state when the store has no subscriptions at all", () => {
    renderTable({ rows: [], totalCount: 0, totalSubscriptions: 0 });
    expect(screen.getByText("No subscriptions yet")).toBeInTheDocument();
    // The empty state has to name the prerequisite — nothing can ever appear
    // here until a product actually offers a subscription.
    expect(
      screen.getByText(/enable subscriptions on a product/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to products/i }),
    ).toHaveAttribute("href", "/admin/products");
  });

  it("shows a filtered empty state when rows exist but none match", () => {
    renderTable({ rows: [], totalCount: 0, totalSubscriptions: 5 });
    expect(
      screen.getByText("No subscriptions match your filters"),
    ).toBeInTheDocument();
  });

  it("shows the feature-off notice and disables Sync now when the flag is off", () => {
    const row = makeRow();
    renderTable({
      rows: [row],
      totalCount: 1,
      totalSubscriptions: 1,
      featureEnabled: false,
    });

    expect(
      screen.getByText("Product subscriptions are turned off"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync now/i })).toBeDisabled();
  });

  // ── a skip is not a pause ─────────────────────────────────────────────
  //
  // `skipNextDelivery` leaves the row ACTIVE with a future `pauseResumesAt`
  // (Stripe voids one invoice and resumes collecting on its own), so the date
  // column has to say a delivery was skipped — `status` alone never will.

  it("labels an active row with a pending skip, without flipping its status badge", () => {
    const row = makeRow({
      status: "active",
      // Far future so the fixture can't age into the past.
      pauseResumesAt: new Date("2099-02-02T00:00:00Z"),
      nextBillingAt: new Date("2099-03-01T00:00:00Z"),
    });
    renderTable({ rows: [row], totalCount: 1, totalSubscriptions: 1 });

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Next billing · one skipped")).toBeInTheDocument();
    expect(table.getByText("Active")).toBeInTheDocument();
    expect(table.queryByText("Paused")).not.toBeInTheDocument();
  });

  it("uses the plain 'Next billing' label once the skip window has elapsed", () => {
    const row = makeRow({
      status: "active",
      pauseResumesAt: new Date("2020-01-01T00:00:00Z"),
    });
    renderTable({ rows: [row], totalCount: 1, totalSubscriptions: 1 });

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Next billing")).toBeInTheDocument();
    expect(
      table.queryByText("Next billing · one skipped"),
    ).not.toBeInTheDocument();
  });

  it("still reads 'Resumes' for a genuinely paused row", () => {
    const row = makeRow({
      status: "paused",
      pauseResumesAt: null,
    });
    renderTable({ rows: [row], totalCount: 1, totalSubscriptions: 1 });

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Resumes")).toBeInTheDocument();
    expect(table.getByText("Indefinitely")).toBeInTheDocument();
  });

  it("renders the summary strip counts", () => {
    renderTable({
      summary: {
        active: 3,
        paused: 1,
        pastDue: 2,
        monthlyRecurringCents: 12345,
      },
    });

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("$123.45")).toBeInTheDocument();
  });
});
