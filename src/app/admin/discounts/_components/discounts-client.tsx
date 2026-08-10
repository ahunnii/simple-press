"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MoreVertical,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  TicketPercent,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../_components/admin-bulk-bar";
import type { AdminFilterDef } from "../../_components/admin-filters";
import type { RouterOutputs } from "~/trpc/react";
import type { DiscountStatus } from "~/lib/validators/discounts";
import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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

// The row shape `discount.getAll` returns, plus the one derivation the page
// computes once (see page.tsx's comment on `now`/`getDiscountStatus`) and
// hands down as `status`. The client never calls `new Date()` itself — that
// was the old table's SSR/hydration hazard: a badge computed from `new
// Date()` during render can read differently on the server-rendered markup
// than on the client's first paint.
export type DiscountRow = RouterOutputs["discount"]["getAll"][number] & {
  status: DiscountStatus;
};

type Props = {
  /** The current page slice only — filtering/sorting/paging happen in page.tsx. */
  discounts: DiscountRow[];
  filters: AdminFilterDef[];
  /**
   * Ids of every row matching the current filters, across all pages — or
   * `null` when more than ADMIN_BULK_SELECTION_LIMIT match and
   * `buildTablePage` declined to enumerate them. `null` is NOT `[]`: an
   * empty array is a genuine "nothing matched". See `useAdminTableSelection`,
   * which takes both.
   */
  matchingIds: string[] | null;
  /** Unfiltered total — distinguishes "no discounts yet" from "no matches". */
  totalDiscounts: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Mirrors `discount.bulkDelete`'s `ownerOnlyProcedure`, resolved
   *  server-side. False OMITS the bulk Delete action rather than disabling it. */
  canBulkDelete: boolean;
};

const BASE_PATH = "/admin/discounts";
const ITEM_NOUN = { one: "discount", many: "discounts" } as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_CHECKBOX = TABLE_HEAD_TIGHT;
const TD_CHECKBOX = TABLE_CELL_TIGHT;

/** "3 of 5" — a bulk op silently touching fewer rows than asked must say so. */
const shortfallMessage = createShortfallMessage(ITEM_NOUN);

/** From the old table's `formatValue`. `value` is percent points for
 *  "percentage" and cents for "fixed" — the same field means two different
 *  units depending on `type`, so the formatting has to branch on it. */
function formatDiscountValue(type: string, value: number): string {
  if (type === "percentage") return `${value}% off`;
  if (type === "free_shipping") return "Free shipping";
  return `$${(value / 100).toFixed(2)} off`;
}

function formatDate(date: Date | null): string {
  if (!date) return "No expiry";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * The ONE place these words are written. The desktop Status badge and the
 * `md:hidden` reflow line both render this function's output, so the two
 * cannot drift the way the pre-migration table's badge and (nonexistent)
 * mobile line could have.
 */
function statusText(row: Pick<DiscountRow, "status" | "startsAt">): string {
  switch (row.status) {
    case "active":
      return "Active";
    case "scheduled":
      return `Scheduled · ${formatDate(row.startsAt)}`;
    case "expired":
      return "Expired";
    case "inactive":
      return "Inactive";
  }
}

// Deviation from the old table, which used the Badge `default` variant
// (solid primary fill) for Active — Collections' Published badge uses
// `success` for the same "this is the good state" meaning, so Active adopts
// it here too for consistency with the rest of the admin.
const STATUS_BADGE_VARIANT: Record<
  DiscountStatus,
  "success" | "outline" | "destructive" | "secondary"
> = {
  active: "success",
  scheduled: "outline",
  expired: "destructive",
  inactive: "secondary",
};

export function DiscountsClient({
  discounts,
  filters,
  matchingIds,
  totalDiscounts,
  totalCount,
  totalPages,
  page,
  pageSize,
  canBulkDelete,
}: Props) {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deleteId, setDeleteId] = useState<string | null>(null);
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
    rowIds: discounts.map((discount) => discount.id),
    matchingIds,
    totalCount,
    page,
    searchParams,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const afterWrite = () => {
    void utils.discount.invalidate();
    router.refresh();
  };

  const deleteMutation = api.discount.delete.useMutation({
    onMutate: loadingToast("Deleting discount…"),
    onSuccess: (_data, id, context) => {
      dismissLoadingToast(context);
      toast.success("Discount deleted");
      pruneSelection([id]);
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _id, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete discount");
    },
  });

  // Separate from bulkActiveMutation so undo's own success toast doesn't
  // offer another Undo, which would let the two ping-pong indefinitely.
  const undoActiveMutation = api.discount.bulkSetActive.useMutation({
    onMutate: loadingToast("Undoing…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.active ? "activated" : "deactivated";
      // Undoing a Deactivate re-activates, which can itself hit the
      // skip-expired guard if a row lapsed in the meantime — report that
      // rather than claiming a clean undo that didn't fully happen.
      if (variables.active && data.skippedExpiredCount > 0) {
        toast.warning(
          `Undone — ${data.count} ${
            data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
          } reactivated; ${data.skippedExpiredCount} expired in the meantime and stayed off.`,
        );
      } else {
        toast.success(
          `Undone — ${data.count} ${
            data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
          } ${verb}`,
        );
      }
      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to undo");
    },
  });

  const bulkActiveMutation = api.discount.bulkSetActive.useMutation({
    // Message depends on direction, unlike Collections' single "Updating…" —
    // Activate and Deactivate are different enough operations to name.
    onMutate: (variables) => ({
      toastId: toast.loading(
        variables.active ? "Activating discounts…" : "Deactivating discounts…",
      ),
    }),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.active ? "activated" : "deactivated";
      const requested = variables.ids.length;

      if (data.count < requested) {
        // The shared `shortfallMessage` blames deletion ("may have been
        // deleted already") — a lie for rows we deliberately skipped because
        // they're expired. Use the dedicated copy whenever that's the reason;
        // fall back to the shared sentence for any other shortfall.
        toast.warning(
          variables.active && data.skippedExpiredCount > 0
            ? activateShortfallMessage(
                data.count,
                requested,
                data.skippedExpiredCount,
              )
            : shortfallMessage(data.count, requested, verb),
        );
      } else {
        // Undo targets `data.changedIds` — the rows this call actually
        // flipped, computed server-side — NOT `variables.ids`. Re-sending
        // the whole selection inverted would touch rows that were already in
        // the target state before this call, which is a second unwanted
        // edit dressed up as a recovery.
        const undoable = data.changedIds;
        toast.success(
          `${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} ${verb}`,
          undoable.length > 0
            ? {
                action: {
                  label: "Undo",
                  onClick: () =>
                    undoActiveMutation.mutate({
                      ids: undoable,
                      active: !variables.active,
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
      toast.error(error.message ?? "Failed to update discounts");
    },
  });

  const bulkDeleteMutation = api.discount.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting discounts…"),
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
      toast.error(error.message ?? "Failed to delete discounts");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const selectedOnPageRows = discounts.filter((discount) =>
    selectedIds.has(discount.id),
  );
  const selectedCodes = selectedOnPageRows.map((discount) => discount.code);
  const deleteTarget = discounts.find((discount) => discount.id === deleteId);

  const overCap = createOverCapGuard(selectedCount, ITEM_NOUN);
  const capReason = createCapDisabledReason(selectedCount, ITEM_NOUN);
  const deleteCapReason = capReason(ADMIN_BULK_DELETE_LIMIT, "delete");

  const handleBulkActive = (active: boolean) => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_SELECTION_LIMIT, "update")) {
      return;
    }
    bulkActiveMutation.mutate({ ids: [...selectedIds], active });
  };

  const handleBulkDelete = () => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_DELETE_LIMIT, "delete")) {
      return;
    }
    bulkDeleteMutation.mutate({ ids: [...selectedIds] });
  };

  // `undoActiveMutation` counts: it writes to the same rows the bulk bar acts
  // on, so leaving the bar live during an undo lets a second bulk action
  // race it.
  const isBulkPending =
    bulkActiveMutation.isPending ||
    undoActiveMutation.isPending ||
    bulkDeleteMutation.isPending;

  const bulkActions: BulkAction[] = [
    {
      label: "Activate",
      icon: Power,
      onClick: () => handleBulkActive(true),
      pending:
        bulkActiveMutation.isPending &&
        bulkActiveMutation.variables?.active === true,
    },
    {
      label: "Deactivate",
      icon: PowerOff,
      onClick: () => handleBulkActive(false),
      pending:
        bulkActiveMutation.isPending &&
        bulkActiveMutation.variables?.active === false,
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

  const hasDiscounts = totalDiscounts > 0;
  const hasResults = discounts.length > 0;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Discount Codes</h1>
          <p>Create and manage discount codes for your store</p>
        </div>
        <Button asChild>
          <Link href={`${BASE_PATH}/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Discount
          </Link>
        </Button>
      </div>

      {!hasDiscounts ? (
        <AdminEmpty
          icon={TicketPercent}
          title="No discount codes yet"
          description="Create your first discount code to offer special deals"
          action={
            <Button asChild>
              <Link href={`${BASE_PATH}/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Discount
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search discounts…"
            // Code is the only field this table searches — it's also the
            // only free text a discount row shows.
            searchAriaLabel="Search discounts by code"
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
              title="No discounts match your filters"
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
                  <TableCaption className="sr-only">Discount codes</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={`w-10 ${TH_CHECKBOX}`}>
                        <Checkbox
                          id="select-all-discounts"
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAllOnPage}
                          aria-label="Select all discounts on this page"
                        />
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        Code
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Discount
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Usage
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Expires
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Status
                      </TableHead>
                      <TableHead scope="col" className={`${TH} text-right`}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.map((discount, index) => {
                      const isSelected = selectedIds.has(discount.id);
                      const expiresLabel = formatDate(discount.expiresAt);

                      return (
                        <TableRow
                          key={discount.id}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell className={TD_CHECKBOX}>
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={onRowClickCapture}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select ${discount.code}`}
                            />
                          </TableCell>

                          <TableCell className={`${TD} whitespace-normal`}>
                            <Link
                              href={`${BASE_PATH}/${discount.id}`}
                              className="font-mono font-medium hover:underline"
                            >
                              {discount.code}
                            </Link>
                            {/* Below md the Discount/Usage/Expires/Status
                                columns are hidden — reflow them here. */}
                            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                              <span>
                                {formatDiscountValue(
                                  discount.type,
                                  discount.value,
                                )}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {discount.usageCount}
                                {discount.usageLimit != null
                                  ? ` / ${discount.usageLimit}`
                                  : ""}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{expiresLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span>{statusText(discount)}</span>
                            </div>
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {formatDiscountValue(discount.type, discount.value)}
                          </TableCell>

                          <TableCell
                            className={`hidden md:table-cell ${TD} tabular-nums`}
                          >
                            {discount.usageCount}
                            {discount.usageLimit != null
                              ? ` / ${discount.usageLimit}`
                              : ""}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {expiresLabel}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            <Badge variant={STATUS_BADGE_VARIANT[discount.status]}>
                              {statusText(discount)}
                            </Badge>
                          </TableCell>

                          <TableCell className={`${TD} text-right`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">
                                    Actions for {discount.code}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`${BASE_PATH}/${discount.id}`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(discount.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget ? `Delete “${deleteTarget.code}”?` : "Delete Discount?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Shoppers will no longer be able to redeem it. Orders that
              already used this code keep their records. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, NOT className. AlertDialogAction wraps a `Button ...
                asChild`, so a className lands on the inner Radix element while
                Button still supplies `bg-primary` — and Slot concatenates the
                two without tailwind-merge, so CSS order decides and primary
                wins. A `className="bg-destructive"` here renders BLACK. */}
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount}{" "}
              {selectedCount === 1 ? "discount" : "discounts"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(selectedCodes, selectedCount, ITEM_NOUN)}.
              Shoppers will no longer be able to redeem{" "}
              {selectedCount === 1 ? "it" : "them"}. Orders that already used{" "}
              {selectedCount === 1 ? "it" : "them"} keep their records. This
              action cannot be undone.
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
                    selectedCount === 1 ? "discount" : "discounts"
                  }`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Shortfall copy specific to Activate. The shared `shortfallMessage` from
 * `admin-bulk-actions.ts` says "…could not be found. They may have been
 * deleted already." — true for a delete shortfall, but a LIE for rows we
 * deliberately skipped because `bulkSetActive` excludes already-expired
 * codes from reactivation (see the router's comment: an activated-then-
 * immediately-re-expired code would just get flipped back off by the
 * write-on-GET materializer on the very next list load). This names the
 * real reason instead, and still accounts for any genuinely-missing rows
 * (deleted by someone else mid-selection) as a remainder.
 */
function activateShortfallMessage(
  done: number,
  requested: number,
  skipped: number,
): string {
  const missing = requested - done - skipped;
  const base = `${done} of ${requested} ${
    requested === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
  } activated — ${skipped} expired ${
    skipped === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
  } ${skipped === 1 ? "was" : "were"} skipped. Edit the expiry date to bring ${
    skipped === 1 ? "it" : "them"
  } back.`;
  return missing > 0 ? `${base} ${missing} could not be found.` : base;
}
