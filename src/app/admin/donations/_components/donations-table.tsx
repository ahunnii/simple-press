"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartHandshake, Search } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminPagination } from "../../_components/admin-pagination";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";

const BASE_PATH = "/admin/donations";
const ITEM_NOUN = { one: "donation", many: "donations" } as const;

// Table type/density live in ../../_components/admin-table-style, matching
// the Orders/Customers/Subscriptions convention.
const TH = TABLE_HEAD;
const TD = TABLE_CELL;

/** Messages longer than this collapse behind a "Show more" toggle. */
const MESSAGE_TRUNCATE_LENGTH = 80;

type DonationRow = RouterOutputs["donation"]["list"][number];

export type DonationsSummary = {
  totalCents: number;
  count: number;
  thisMonthCents: number;
};

type Props = {
  /** The current page slice only — filtering/sorting/paging happen server-side in page.tsx. */
  rows: DonationRow[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Unfiltered count — distinguishes "no donations yet" from "no matches". */
  totalDonations: number;
  summary: DonationsSummary;
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

/** A donor message, truncated past `MESSAGE_TRUNCATE_LENGTH` with a toggle to expand it. */
function MessageCell({ message }: { message: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!message) {
    return <span className="text-muted-foreground">—</span>;
  }

  const isLong = message.length > MESSAGE_TRUNCATE_LENGTH;
  const display =
    expanded || !isLong
      ? message
      : `${message.slice(0, MESSAGE_TRUNCATE_LENGTH)}…`;

  return (
    <div className="max-w-xs">
      <p className="text-foreground text-sm break-words whitespace-pre-wrap">
        {display}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground mt-1 text-xs underline underline-offset-2"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export function DonationsTable({
  rows,
  totalCount,
  totalPages,
  page,
  pageSize,
  totalDonations,
  summary,
}: Props) {
  const hasResults = rows.length > 0;
  const isFiltered = totalDonations > 0 && !hasResults;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Donations</h1>
          <p>One-time donations and tips received through your store</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Total raised"
          value={formatPrice(summary.totalCents)}
        />
        <StatTile label="Donations" value={String(summary.count)} />
        <StatTile
          label="This month"
          value={formatPrice(summary.thisMonthCents)}
        />
      </div>

      <AdminFilters
        basePath={BASE_PATH}
        searchPlaceholder="Search by donor name, email, or message…"
        searchAriaLabel="Search donations by donor name, email, or message"
        filters={[]}
        resultCount={totalCount}
        itemNoun={ITEM_NOUN}
      />

      {!hasResults ? (
        <AdminEmpty
          icon={isFiltered ? Search : HeartHandshake}
          title={
            isFiltered ? "No donations match your filters" : "No donations yet"
          }
          description={
            isFiltered
              ? undefined
              : // The empty state points at the prerequisite: nothing shows up
                // here until the donate page is actually configured and live.
                "Donations appear here once a shopper gives through your donate page. Set up your label, presets, and payment handles first."
          }
          filtered={isFiltered}
          action={
            isFiltered ? (
              <Button variant="outline" asChild>
                <Link href={BASE_PATH}>Clear filters</Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/admin/settings/donations">
                  Go to Donations settings
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <Card className={TABLE_CARD}>
            <Table>
              <TableCaption className="sr-only">Donations</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className={TH}>
                    Date
                  </TableHead>
                  <TableHead scope="col" className={TH}>
                    Donor
                  </TableHead>
                  <TableHead scope="col" className={`${TH} text-right`}>
                    Amount
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TH}`}
                  >
                    Message
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden lg:table-cell ${TH}`}
                  >
                    Email
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell
                      className={`${TD} text-foreground whitespace-nowrap`}
                    >
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell className={`${TD} font-medium`}>
                      {row.donorName ?? (
                        <span className="text-muted-foreground italic">
                          Anonymous
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`${TD} text-foreground text-right font-medium tabular-nums`}
                    >
                      {formatPrice(row.amountCents)}
                    </TableCell>
                    <TableCell className={`hidden md:table-cell ${TD}`}>
                      <MessageCell message={row.message} />
                    </TableCell>
                    <TableCell
                      className={`hidden lg:table-cell ${TD} text-muted-foreground`}
                    >
                      {row.donorEmail ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath={BASE_PATH}
            itemNoun={ITEM_NOUN}
          />
        </>
      )}
    </div>
  );
}
