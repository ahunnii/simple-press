"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  Inbox,
  PhoneCall,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../_components/admin-bulk-bar";
import type { AdminFilterDef } from "../../_components/admin-filters";
import type { QuoteStatusDb } from "~/lib/validators/quote-calculator";
import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";
import { QUOTE_STATUS_LABELS } from "~/lib/validators/quote-calculator";
import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { AdminBulkBar } from "../../_components/admin-bulk-bar";
import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminPagination } from "../../_components/admin-pagination";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_CELL_TIGHT,
  TABLE_HEAD,
  TABLE_HEAD_TIGHT,
} from "../../_components/admin-table-style";
import {
  createCapDisabledReason,
  createOverCapGuard,
  createShortfallMessage,
  describeSelection,
} from "../../_lib/admin-bulk-actions";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import { useAdminTableSelection } from "../../_lib/use-admin-table-selection";

// The row shape `quoteSubmission.list` returns, with `status` narrowed from
// `string` to `QuoteStatusDb` by the page (see `toQuoteStatus` in page.tsx).
// The intersection narrows correctly — `string & QuoteStatusDb` collapses to
// `QuoteStatusDb` since it's a literal-union subtype of `string` — so every
// column below reads a real status, not a bare string.
export type QuoteRow = RouterOutputs["quoteSubmission"]["list"][number] & {
  status: QuoteStatusDb;
};

type Props = {
  /** The current page slice only — filtering/sorting/paging happen in page.tsx. */
  submissions: QuoteRow[];
  filters: AdminFilterDef[];
  /**
   * Ids of every row matching the current filters, across all pages — or
   * `null` when more than ADMIN_BULK_SELECTION_LIMIT match and
   * `buildTablePage` declined to enumerate them. `null` is NOT `[]`.
   */
  matchingIds: string[] | null;
  /** Unfiltered total — distinguishes "no quotes yet" from "no matches". */
  totalQuotes: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Mirrors `quoteSubmission.bulkDelete`'s `ownerOnlyProcedure`, resolved
   *  server-side. False OMITS the bulk Delete action rather than disabling it. */
  canBulkDelete: boolean;
};

const BASE_PATH = "/admin/quotes";
const ITEM_NOUN = { one: "quote", many: "quotes" } as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_CHECKBOX = TABLE_HEAD_TIGHT;
const TD_CHECKBOX = TABLE_CELL_TIGHT;

/** "3 of 5" — a bulk op silently touching fewer rows than asked must say so. */
const shortfallMessage = createShortfallMessage(ITEM_NOUN);

// Desktop Status badge and the md:hidden reflow line both render from these
// two maps, so the two can never drift.
const STATUS_BADGE_VARIANT: Record<
  QuoteStatusDb,
  "default" | "secondary" | "success" | "outline"
> = {
  NEW: "default",
  CONTACTED: "secondary",
  WON: "success",
  LOST: "outline",
};

/** Lower-case verb used inside a sentence: "3 quotes marked contacted". */
const STATUS_VERB: Record<QuoteStatusDb, string> = {
  NEW: "new",
  CONTACTED: "contacted",
  WON: "won",
  LOST: "lost",
};

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function QuoteInboxClient({
  submissions,
  filters,
  matchingIds,
  totalQuotes,
  totalCount,
  totalPages,
  page,
  pageSize,
  canBulkDelete,
}: Props) {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ── Selection ──────────────────────────────────────────────────────────────
  const {
    selectedIds,
    selectedCount,
    isEscalated,
    allPageSelected,
    somePageSelected,
    canEscalate,
    escalationDisabledReason,
    clearSelection,
    pruneSelection,
    handleRowToggle,
    handleSelectAllOnPage,
    handleSelectAllMatching,
    onRowClickCapture,
    onFiltersChange,
  } = useAdminTableSelection({
    rowIds: submissions.map((submission) => submission.id),
    matchingIds,
    totalCount,
    page,
    searchParams,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const afterWrite = () => {
    void utils.quoteSubmission.invalidate();
    router.refresh();
  };

  // Exact inverse of a bulk status change: `bulkSetStatus` returns each
  // flipped row WITH the status it had before the write, and this replays
  // those pairs verbatim — a selection whose rows sat in three different
  // statuses restores each one precisely. A separate mutation (not
  // `bulkStatusMutation`) so undo's own success toast doesn't offer another
  // Undo, which would let the two ping-pong indefinitely.
  const undoStatusMutation = api.quoteSubmission.bulkRestoreStatus.useMutation({
    onMutate: loadingToast("Undoing…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        `Undone — ${data.count} ${
          data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
        } reverted`,
      );
      pruneSelection(variables.entries.map((entry) => entry.id));
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to undo");
    },
  });

  const bulkStatusMutation = api.quoteSubmission.bulkSetStatus.useMutation({
    onMutate: (variables) => ({
      toastId: toast.loading(
        `Marking ${variables.ids.length === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} ${STATUS_VERB[variables.status]}…`,
      ),
    }),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = STATUS_VERB[variables.status];
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, verb));
      } else {
        // Undo targets `data.changed` — the rows this call actually flipped,
        // each paired server-side with its prior status — and restores every
        // row to exactly that status via bulkRestoreStatus.
        const undoable = data.changed;
        toast.success(
          `${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} marked ${verb}`,
          undoable.length > 0
            ? {
                action: {
                  label: "Undo",
                  onClick: () =>
                    undoStatusMutation.mutate({
                      entries: undoable.map(({ id, previousStatus }) => ({
                        id,
                        status: previousStatus,
                      })),
                    }),
                },
              }
            : undefined,
        );
      }

      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update quotes");
    },
  });

  const bulkDeleteMutation = api.quoteSubmission.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting quotes…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, "deleted"));
      } else {
        toast.success(
          `${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} deleted`,
        );
      }

      pruneSelection(variables.ids);
      setBulkDeleteOpen(false);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete quotes");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const selectedOnPageRows = submissions.filter((submission) =>
    selectedIds.has(submission.id),
  );
  const selectedNames = selectedOnPageRows.map(
    (submission) => submission.contactName,
  );

  const overCap = createOverCapGuard(selectedCount, ITEM_NOUN);
  const capReason = createCapDisabledReason(selectedCount, ITEM_NOUN);
  const deleteCapReason = capReason(ADMIN_BULK_DELETE_LIMIT, "delete");

  const handleBulkStatus = (status: QuoteStatusDb) => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_SELECTION_LIMIT, "update")) {
      return;
    }
    bulkStatusMutation.mutate({ ids: [...selectedIds], status });
  };

  const handleBulkDelete = () => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_DELETE_LIMIT, "delete")) {
      return;
    }
    bulkDeleteMutation.mutate({ ids: [...selectedIds] });
  };

  // The undo mutation counts too: it writes to the same rows the bulk bar
  // acts on, so leaving the bar live during an undo lets a second bulk action
  // race it.
  const isBulkPending =
    bulkStatusMutation.isPending ||
    undoStatusMutation.isPending ||
    bulkDeleteMutation.isPending;

  const bulkActions: BulkAction[] = [
    {
      label: "Mark contacted",
      icon: PhoneCall,
      onClick: () => handleBulkStatus("CONTACTED"),
      pending:
        bulkStatusMutation.isPending &&
        bulkStatusMutation.variables?.status === "CONTACTED",
    },
    {
      label: "Mark won",
      icon: CheckCircle2,
      onClick: () => handleBulkStatus("WON"),
      pending:
        bulkStatusMutation.isPending &&
        bulkStatusMutation.variables?.status === "WON",
    },
    {
      label: "Mark lost",
      icon: XCircle,
      onClick: () => handleBulkStatus("LOST"),
      pending:
        bulkStatusMutation.isPending &&
        bulkStatusMutation.variables?.status === "LOST",
    },
    // Omitted, not disabled, for a MANAGER: `bulkDelete` is
    // `ownerOnlyProcedure`, and a button that only ever produces a FORBIDDEN
    // toast is worse than no button. The procedure remains the enforcement.
    ...(canBulkDelete
      ? [
          {
            label: "Delete",
            icon: Trash2,
            variant: "destructive" as const,
            onClick: () => {
              if (overCap(ADMIN_BULK_DELETE_LIMIT, "delete")) return;
              setBulkDeleteOpen(true);
            },
            pending: bulkDeleteMutation.isPending,
            disabledReason: deleteCapReason,
          },
        ]
      : []),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasQuotes = totalQuotes > 0;
  const hasResults = submissions.length > 0;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Quotes</h1>
          <p>Leads from your quote calculators, ready to follow up on</p>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`${BASE_PATH}/calculators`}>Manage calculators</Link>
        </Button>
      </div>

      {!hasQuotes ? (
        <AdminEmpty
          icon={Inbox}
          title="No quotes yet"
          description="Quotes land here as soon as a visitor submits one of your calculators. Publish a calculator to start collecting leads."
          action={
            <Button variant="outline" asChild>
              <Link href={`${BASE_PATH}/calculators`}>Manage calculators</Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search quotes…"
            searchAriaLabel="Search quotes by contact name, email, or calculator"
            filters={filters}
            resultCount={totalCount}
            itemNoun={ITEM_NOUN}
            onFiltersChange={onFiltersChange}
          />

          <AdminBulkBar
            count={selectedCount}
            itemNoun={ITEM_NOUN}
            actions={bulkActions}
            onClear={clearSelection}
            disabled={isBulkPending}
            selectAllMatching={
              canEscalate || isEscalated
                ? {
                    total: totalCount,
                    onSelect: handleSelectAllMatching,
                    isEscalated,
                    disabledReason: escalationDisabledReason,
                  }
                : undefined
            }
          />

          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title="No quotes match your filters"
              filtered
              action={
                <Button variant="outline" asChild>
                  <Link href={BASE_PATH}>Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <Card className={TABLE_CARD}>
                <Table>
                  <TableCaption className="sr-only">Quotes</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={`w-10 ${TH_CHECKBOX}`}>
                        <Checkbox
                          id="select-all-quotes"
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAllOnPage}
                          aria-label="Select all quotes on this page"
                        />
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        Contact
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Calculator
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Estimate
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Status
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Received
                      </TableHead>
                      <TableHead scope="col" className={`${TH} text-right`}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission, index) => {
                      const isSelected = selectedIds.has(submission.id);
                      // Effective quote: the owner-adjusted final amount when
                      // one exists, else the computed estimate. The sort in
                      // page.tsx uses the same fallback.
                      const effectiveCents =
                        submission.finalQuoteCents ?? submission.estimateCents;
                      const estimateLabel =
                        effectiveCents != null
                          ? formatPrice(effectiveCents)
                          : "—";
                      const quoteHint = submission.quoteSentAt
                        ? "Quote sent to the customer"
                        : submission.finalQuoteCents != null
                          ? "Owner-adjusted amount"
                          : undefined;
                      const receivedFull = formatDate(submission.createdAt);
                      const receivedShort = SHORT_DATE_FORMAT.format(
                        submission.createdAt,
                      );

                      return (
                        <TableRow
                          key={submission.id}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell className={TD_CHECKBOX}>
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={onRowClickCapture}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select ${submission.contactName}`}
                            />
                          </TableCell>

                          <TableCell className={`${TD} whitespace-normal`}>
                            <div className="min-w-0">
                              {/* The link is the NAME only, not the whole
                                  cell — an anchor wrapping the name and email
                                  together would give assistive tech an
                                  accessible name that runs both lines into
                                  one. */}
                              <Link
                                href={`${BASE_PATH}/${submission.id}`}
                                className="font-medium hover:underline"
                              >
                                {submission.contactName}
                              </Link>
                              <p className="text-muted-foreground line-clamp-1 text-sm">
                                {submission.contactEmail}
                              </p>
                              {/* Below md the Calculator/Estimate/Status/
                                  Received columns are hidden — reflow them
                                  here. */}
                              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                                <span>{submission.calculatorName}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-foreground font-medium tabular-nums">
                                  {estimateLabel}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {QUOTE_STATUS_LABELS[submission.status]}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span title={receivedFull}>
                                  {receivedShort}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {submission.calculatorName}
                          </TableCell>

                          <TableCell
                            className={`hidden md:table-cell ${TD} tabular-nums`}
                          >
                            <span title={quoteHint}>{estimateLabel}</span>
                            {submission.quoteSentAt && (
                              <CheckCircle2
                                className="text-muted-foreground ml-1.5 inline h-3.5 w-3.5 align-[-2px]"
                                aria-label="Quote sent to the customer"
                              />
                            )}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            <Badge
                              variant={STATUS_BADGE_VARIANT[submission.status]}
                            >
                              {QUOTE_STATUS_LABELS[submission.status]}
                            </Badge>
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            <span title={receivedFull}>{receivedShort}</span>
                          </TableCell>

                          <TableCell className={`${TD} text-right`}>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`${BASE_PATH}/${submission.id}`}>
                                <Eye
                                  aria-hidden="true"
                                  className="mr-2 h-4 w-4"
                                />
                                View
                                <span className="sr-only">
                                  {" "}
                                  {submission.contactName}
                                </span>
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
        </>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} {selectedCount === 1 ? "quote" : "quotes"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(selectedNames, selectedCount, ITEM_NOUN)}.{" "}
              Their contact info, answers and estimate will be gone for good.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting…"
                : `Delete ${selectedCount} ${
                    selectedCount === 1 ? "quote" : "quotes"
                  }`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
