import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DonationsTable } from "./donations-table";

// `AdminFilters`/`AdminPagination` (mounted inside the table) read
// `useRouter`/`useSearchParams`/`usePathname` directly — stub the whole
// module so they render without a real Next.js router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/donations",
}));

type TableProps = Parameters<typeof DonationsTable>[0];
type Row = TableProps["rows"][number];

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "don_1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    amountCents: 2500,
    currency: "usd",
    donorName: "Jane Doe",
    donorEmail: "jane@example.com",
    message: "Keep up the great work!",
    ...overrides,
  };
}

const EMPTY_SUMMARY = { totalCents: 0, count: 0, thisMonthCents: 0 };

function renderTable(overrides: Partial<TableProps> = {}) {
  return render(
    <DonationsTable
      rows={[]}
      totalCount={0}
      totalPages={1}
      page={1}
      pageSize={25}
      totalDonations={0}
      summary={EMPTY_SUMMARY}
      {...overrides}
    />,
  );
}

describe("DonationsTable", () => {
  it("renders a row's donor, amount, and message", () => {
    const row = makeRow();
    renderTable({ rows: [row], totalCount: 1, totalDonations: 1 });

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Jane Doe")).toBeInTheDocument();
    expect(table.getByText("$25.00")).toBeInTheDocument();
    expect(table.getByText("Keep up the great work!")).toBeInTheDocument();
    expect(table.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("falls back to 'Anonymous' when the donor left no name", () => {
    const row = makeRow({ donorName: null });
    renderTable({ rows: [row], totalCount: 1, totalDonations: 1 });

    expect(
      within(screen.getByRole("table")).getByText("Anonymous"),
    ).toBeInTheDocument();
  });

  it("truncates a long message behind a 'Show more' toggle", () => {
    const longMessage = "a".repeat(120);
    const row = makeRow({ message: longMessage });
    renderTable({ rows: [row], totalCount: 1, totalDonations: 1 });

    expect(screen.getByText(/^a+…$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show more/i })).toBeInTheDocument();
  });

  it("shows a full empty state when the store has no donations at all", () => {
    renderTable({ rows: [], totalCount: 0, totalDonations: 0 });
    expect(screen.getByText("No donations yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to donations settings/i }),
    ).toHaveAttribute("href", "/admin/settings/donations");
  });

  it("shows a filtered empty state when rows exist but none match", () => {
    renderTable({ rows: [], totalCount: 0, totalDonations: 5 });
    expect(
      screen.getByText("No donations match your filters"),
    ).toBeInTheDocument();
  });

  it("renders the summary strip", () => {
    renderTable({
      summary: { totalCents: 123456, count: 7, thisMonthCents: 5000 },
    });

    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });
});
