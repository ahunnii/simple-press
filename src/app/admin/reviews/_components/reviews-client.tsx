/* eslint-disable @next/next/no-img-element -- review photos are arbitrary S3
   URLs rendered at a fixed 40px; next/image's optimization/loader machinery
   buys nothing at this size and adds a remote-pattern config burden. */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Check,
  Eye,
  EyeOff,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../_components/admin-bulk-bar";
import type { AdminFilterDef } from "../../_components/admin-filters";
import type { ReviewStatus } from "~/lib/validators/reviews";
import type { RouterOutputs } from "~/trpc/react";
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
  DropdownMenuSeparator,
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
import { OwnerReviewDialog } from "./owner-review-dialog";

// The row shape `review.listAll` returns, plus the one derivation the page
// computes once (via `getReviewStatus` in `~/lib/validators/reviews`) and
// hands down as `status`. The client never derives it itself: hidden ▸
// published ▸ pending is a three-way priority that the filter predicate, the
// badge and the row actions all key off, and re-deriving it here would be a
// second copy free to drift from the one the page filtered with.
export type ReviewRow = RouterOutputs["review"]["listAll"][number] & {
  status: ReviewStatus;
};

type Props = {
  /** The current page slice only — filtering/sorting/paging happen in page.tsx. */
  reviews: ReviewRow[];
  filters: AdminFilterDef[];
  /**
   * Ids of every row matching the current filters, across all pages — or
   * `null` when more than ADMIN_BULK_SELECTION_LIMIT match and
   * `buildTablePage` declined to enumerate them. `null` is NOT `[]`: an empty
   * array is a genuine "nothing matched". See `useAdminTableSelection`, which
   * takes both.
   */
  matchingIds: string[] | null;
  /** Unfiltered total — distinguishes "no reviews yet" from "no matches". */
  totalReviews: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Mirrors `review.bulkDelete`'s `ownerOnlyProcedure`, resolved
   *  server-side. False OMITS the bulk Delete action rather than disabling it. */
  canBulkDelete: boolean;
};

const BASE_PATH = "/admin/reviews";
const ITEM_NOUN = { one: "review", many: "reviews" } as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_CHECKBOX = TABLE_HEAD_TIGHT;
const TD_CHECKBOX = TABLE_CELL_TIGHT;

/** "3 of 5" — a bulk op silently touching fewer rows than asked must say so. */
const shortfallMessage = createShortfallMessage(ITEM_NOUN);

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending",
  published: "Published",
  hidden: "Hidden",
};

const STATUS_BADGE_VARIANT: Record<
  ReviewStatus,
  "secondary" | "success" | "destructive"
> = {
  pending: "secondary",
  published: "success",
  hidden: "destructive",
};

/**
 * `ProductReview.source` is a plain string column in Prisma, not an enum, so
 * this lookup is total by fallback rather than by type — any value the DB
 * grows that isn't mapped reads as "Customer", which is what every
 * non-owner-added row is.
 */
const SOURCE_LABEL: Record<string, string> = {
  customer: "Customer",
  owner: "Owner added",
};

function formatDate(date: Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

function ratingLabel(rating: number): string {
  return `${rating} out of 5 stars`;
}

export function ReviewsClient({
  reviews,
  filters,
  matchingIds,
  totalReviews,
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
  const [editingReview, setEditingReview] = useState<ReviewRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
    rowIds: reviews.map((review) => review.id),
    matchingIds,
    totalCount,
    page,
    searchParams,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const afterWrite = () => {
    void utils.review.invalidate();
    router.refresh();
  };

  const approveMutation = api.review.approve.useMutation({
    onMutate: loadingToast("Updating review…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(variables.isApproved ? "Review approved" : "Review unapproved");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update review");
    },
  });

  const hideMutation = api.review.toggleHidden.useMutation({
    onMutate: loadingToast("Updating review…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(variables.isHidden ? "Review hidden" : "Review unhidden");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update review");
    },
  });

  const deleteMutation = api.review.delete.useMutation({
    onMutate: loadingToast("Deleting review…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success("Review deleted");
      pruneSelection([variables.id]);
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete review");
    },
  });

  // Separate from `bulkApproveMutation` so undo's own success toast doesn't
  // offer another Undo, which would let the two ping-pong indefinitely.
  const undoApproveMutation = api.review.bulkSetApproved.useMutation({
    onMutate: loadingToast("Undoing…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.isApproved ? "approved" : "unapproved";
      toast.success(
        `Undone — ${data.count} ${
          data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
        } ${verb}`,
      );
      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to undo");
    },
  });

  const bulkApproveMutation = api.review.bulkSetApproved.useMutation({
    // Direction-aware, unlike a single "Updating…": approving a queue of
    // pending submissions and pulling published ones back are different enough
    // operations to name while they run.
    onMutate: (variables) => ({
      toastId: toast.loading(
        variables.isApproved ? "Approving reviews…" : "Unapproving reviews…",
      ),
    }),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.isApproved ? "approved" : "unapproved";
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, verb));
      } else {
        // Undo targets `data.changedIds` — the rows this call actually
        // flipped, computed server-side — NOT `variables.ids`. Re-sending the
        // whole selection inverted would touch rows that were already in the
        // target state before this call, which is a second unwanted edit
        // dressed up as a recovery.
        const undoable = data.changedIds;
        toast.success(
          `${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} ${verb}`,
          undoable.length > 0
            ? {
                action: {
                  label: "Undo",
                  onClick: () =>
                    undoApproveMutation.mutate({
                      ids: undoable,
                      isApproved: !variables.isApproved,
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
      toast.error(error.message ?? "Failed to update reviews");
    },
  });

  // Same split, same reason, for the hide/unhide pair.
  const undoHideMutation = api.review.bulkSetHidden.useMutation({
    onMutate: loadingToast("Undoing…"),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.isHidden ? "hidden" : "unhidden";
      toast.success(
        `Undone — ${data.count} ${
          data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many
        } ${verb}`,
      );
      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to undo");
    },
  });

  const bulkHideMutation = api.review.bulkSetHidden.useMutation({
    onMutate: (variables) => ({
      toastId: toast.loading(
        variables.isHidden ? "Hiding reviews…" : "Unhiding reviews…",
      ),
    }),
    onSuccess: (data, variables, context) => {
      dismissLoadingToast(context);
      const verb = variables.isHidden ? "hidden" : "unhidden";
      const requested = variables.ids.length;

      if (data.count < requested) {
        toast.warning(shortfallMessage(data.count, requested, verb));
      } else {
        const undoable = data.changedIds;
        toast.success(
          `${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} ${verb}`,
          undoable.length > 0
            ? {
                action: {
                  label: "Undo",
                  onClick: () =>
                    undoHideMutation.mutate({
                      ids: undoable,
                      isHidden: !variables.isHidden,
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
      toast.error(error.message ?? "Failed to update reviews");
    },
  });

  const bulkDeleteMutation = api.review.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting reviews…"),
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
      toast.error(error.message ?? "Failed to delete reviews");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const selectedOnPageRows = reviews.filter((review) =>
    selectedIds.has(review.id),
  );
  const selectedNames = selectedOnPageRows.map((review) => review.customerName);
  const deleteTarget = reviews.find((review) => review.id === deleteId);

  const overCap = createOverCapGuard(selectedCount, ITEM_NOUN);
  const capReason = createCapDisabledReason(selectedCount, ITEM_NOUN);
  const deleteCapReason = capReason(ADMIN_BULK_DELETE_LIMIT, "delete");

  const handleBulkApprove = (isApproved: boolean) => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_SELECTION_LIMIT, "update")) {
      return;
    }
    bulkApproveMutation.mutate({ ids: [...selectedIds], isApproved });
  };

  const handleBulkHide = (isHidden: boolean) => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_SELECTION_LIMIT, "update")) {
      return;
    }
    bulkHideMutation.mutate({ ids: [...selectedIds], isHidden });
  };

  const handleBulkDelete = () => {
    if (selectedCount === 0 || overCap(ADMIN_BULK_DELETE_LIMIT, "delete")) {
      return;
    }
    bulkDeleteMutation.mutate({ ids: [...selectedIds] });
  };

  // The undo mutations count: they write to the same rows the bulk bar acts
  // on, so leaving the bar live during an undo lets a second bulk action race
  // it.
  const isBulkPending =
    bulkApproveMutation.isPending ||
    undoApproveMutation.isPending ||
    bulkHideMutation.isPending ||
    undoHideMutation.isPending ||
    bulkDeleteMutation.isPending;

  const bulkActions: BulkAction[] = [
    {
      label: "Approve",
      icon: Check,
      onClick: () => handleBulkApprove(true),
      pending:
        bulkApproveMutation.isPending &&
        bulkApproveMutation.variables?.isApproved === true,
    },
    {
      label: "Unapprove",
      icon: Undo2,
      onClick: () => handleBulkApprove(false),
      pending:
        bulkApproveMutation.isPending &&
        bulkApproveMutation.variables?.isApproved === false,
    },
    {
      label: "Hide",
      icon: EyeOff,
      onClick: () => handleBulkHide(true),
      pending:
        bulkHideMutation.isPending &&
        bulkHideMutation.variables?.isHidden === true,
    },
    {
      label: "Unhide",
      icon: Eye,
      onClick: () => handleBulkHide(false),
      pending:
        bulkHideMutation.isPending &&
        bulkHideMutation.variables?.isHidden === false,
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

  const hasReviews = totalReviews > 0;
  const hasResults = reviews.length > 0;

  return (
    <>
      {!hasReviews ? (
        <AdminEmpty
          icon={MessageSquare}
          title="No reviews yet"
          description="Reviews appear here once customers submit them on a product page. You can also add one yourself."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Review
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search reviews…"
            searchAriaLabel="Search reviews by reviewer name, email, headline, review text, reviewer title or product name"
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
              title="No reviews match your filters"
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
                  <TableCaption className="sr-only">Reviews</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={`w-10 ${TH_CHECKBOX}`}>
                        <Checkbox
                          id="select-all-reviews"
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAllOnPage}
                          aria-label="Select all reviews on this page"
                        />
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        Review
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Reviewer
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Product
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Source
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
                        Date
                      </TableHead>
                      <TableHead scope="col" className={`${TH} text-right`}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review, index) => {
                      const isSelected = selectedIds.has(review.id);
                      const sourceLabel = SOURCE_LABEL[review.source] ?? "Customer";
                      // One date column, always `reviewDate` — the key the
                      // list actually sorts by. Customer submissions set
                      // `reviewDate` to now() on submit, so nothing meaningful
                      // is lost versus the old UI's relative `createdAt`, and
                      // the visible date can never disagree with sort order.
                      const dateLabel = formatDate(review.reviewDate);
                      const extraImageCount = review.images.length - 3;

                      return (
                        <TableRow
                          key={review.id}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell className={TD_CHECKBOX}>
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={onRowClickCapture}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select review by ${review.customerName}`}
                            />
                          </TableCell>

                          <TableCell
                            className={`${TD} max-w-md whitespace-normal`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                role="img"
                                aria-label={ratingLabel(review.rating)}
                                className="flex gap-0.5"
                              >
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    aria-hidden="true"
                                    className={
                                      s <= review.rating
                                        ? "h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                                        : "h-3.5 w-3.5 text-muted-foreground/30"
                                    }
                                  />
                                ))}
                              </div>
                              {review.verifiedPurchase && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <ShieldCheck className="h-3 w-3" />
                                  Verified
                                </Badge>
                              )}
                            </div>

                            {review.title && (
                              <p className="mt-1 text-sm font-medium">
                                {review.title}
                              </p>
                            )}
                            <p className="text-muted-foreground line-clamp-2 text-sm">
                              {review.comment}
                            </p>

                            {review.images.length > 0 && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                {review.images.slice(0, 3).map((img, i) => (
                                  <img
                                    key={img}
                                    src={img}
                                    alt={`Review photo ${i + 1}`}
                                    loading="lazy"
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                ))}
                                {extraImageCount > 0 && (
                                  <span className="text-muted-foreground bg-muted rounded px-1.5 py-1 text-xs">
                                    +{extraImageCount}
                                  </span>
                                )}
                              </div>
                            )}

                            {review.helpfulCount > 0 && (
                              // Gives the "Most helpful" sort a visible cause
                              // — a sort with no corresponding on-screen value
                              // is a control the owner can't reason about.
                              <p className="text-muted-foreground mt-1 text-xs">
                                {review.helpfulCount} found helpful
                              </p>
                            )}

                            {/* Below md the Reviewer/Product/Source/Status/
                                Date columns are hidden — reflow them here. */}
                            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                              <span className="text-foreground font-medium">
                                {review.customerName}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{review.product.name}</span>
                              <span aria-hidden="true">·</span>
                              <span>{sourceLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span>{STATUS_LABEL[review.status]}</span>
                              <span aria-hidden="true">·</span>
                              <span>{dateLabel}</span>
                            </div>
                          </TableCell>

                          <TableCell
                            className={`hidden md:table-cell ${TD} whitespace-normal`}
                          >
                            <div className="font-medium">
                              {review.customerName}
                            </div>
                            {review.customerEmail && (
                              <div className="text-muted-foreground text-sm">
                                {review.customerEmail}
                              </div>
                            )}
                            {review.customerTitle && (
                              <div className="text-muted-foreground text-sm">
                                {review.customerTitle}
                              </div>
                            )}
                          </TableCell>

                          <TableCell
                            className={`hidden md:table-cell ${TD} whitespace-normal`}
                          >
                            <Link
                              href={`/admin/products/${review.product.id}`}
                              className="hover:underline"
                            >
                              {review.product.name}
                            </Link>
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {sourceLabel}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            <Badge variant={STATUS_BADGE_VARIANT[review.status]}>
                              {STATUS_LABEL[review.status]}
                            </Badge>
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {dateLabel}
                          </TableCell>

                          <TableCell className={`${TD} text-right`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">
                                    Actions for review by {review.customerName}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {/* Only owner-added rows are editable — a
                                    customer's own words are not the owner's to
                                    rewrite. */}
                                {review.source === "owner" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setEditingReview(review)}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}

                                {/* Approve/Unapprove are offered only from the
                                    two visible states. A hidden row gets
                                    NEITHER — preserved from the old list:
                                    while `isHidden` is true the approval flag
                                    changes nothing a shopper can see, so
                                    offering it would be a control with no
                                    observable effect. Unhide first. */}
                                {review.status === "pending" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      approveMutation.mutate({
                                        id: review.id,
                                        isApproved: true,
                                      })
                                    }
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Approve
                                  </DropdownMenuItem>
                                )}

                                {review.status === "published" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      approveMutation.mutate({
                                        id: review.id,
                                        isApproved: false,
                                      })
                                    }
                                  >
                                    <Undo2 className="mr-2 h-4 w-4" />
                                    Unapprove
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() =>
                                    hideMutation.mutate({
                                      id: review.id,
                                      isHidden: !review.isHidden,
                                    })
                                  }
                                >
                                  {review.isHidden ? (
                                    <Eye className="mr-2 h-4 w-4" />
                                  ) : (
                                    <EyeOff className="mr-2 h-4 w-4" />
                                  )}
                                  {review.isHidden ? "Unhide" : "Hide"}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(review.id)}
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

      {/* Create dialog — reachable from the unfiltered empty state's action.
          Rendered outside the empty-state branch so its open/close state
          survives the moment the first review lands and the table replaces
          the empty state. */}
      <OwnerReviewDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          afterWrite();
        }}
      />

      {/* Edit dialog. Mounted only while a row is being edited: the dialog
          seeds its form from `defaultValues` and resets on open, so a
          persistently-mounted instance would need the row anyway. */}
      {editingReview && (
        <OwnerReviewDialog
          review={editingReview}
          isOpen
          onClose={() => setEditingReview(null)}
          onSuccess={() => {
            setEditingReview(null);
            afterWrite();
          }}
        />
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
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the review
              {deleteTarget ? ` from ${deleteTarget.customerName}` : ""} and
              update the product&apos;s rating. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, NOT className. AlertDialogAction wraps a `Button …
                asChild`, so a className lands on the inner Radix element while
                Button still supplies `bg-primary` — and Slot concatenates the
                two without tailwind-merge, so CSS order decides and primary
                wins. A `className="bg-destructive"` here renders BLACK (the
                bug the old reviews list shipped). */}
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteMutation.mutate({ id: deleteId });
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
              Delete {selectedCount} {selectedCount === 1 ? "review" : "reviews"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(selectedNames, selectedCount, ITEM_NOUN)}.{" "}
              {selectedCount === 1 ? "It" : "They"} will disappear from your
              storefront immediately, and each affected product&apos;s rating
              and review count will be recalculated. This action cannot be
              undone.
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
                    selectedCount === 1 ? "review" : "reviews"
                  }`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
