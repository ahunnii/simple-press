"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Check,
  Eye,
  EyeOff,
  ImageIcon,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../_components/admin-bulk-bar";
import type { AdminFilterDef } from "../../_components/admin-filters";
import type { TestimonialStatus } from "~/lib/validators/testimonials";
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
import { ManageTestimonialImagesDialog } from "./manage-testimonial-images-dialog";
import { OwnerTestimonialDialog } from "./owner-testimonial-dialog";

// The row shape `testimonial.list` returns, plus the one derivation the page
// computes once (via `getTestimonialStatus` in `~/lib/validators/testimonials`)
// and hands down as `status`. The client never derives it itself: hidden ▸
// published ▸ pending is a three-way priority that the filter predicate, the
// badge and the row actions all key off, and re-deriving it here would be a
// second copy free to drift from the one the page filtered with.
export type TestimonialRow = RouterOutputs["testimonial"]["list"][number] & {
  status: TestimonialStatus;
};

type Props = {
  /** The current page slice only — filtering/sorting/paging happen in page.tsx. */
  testimonials: TestimonialRow[];
  filters: AdminFilterDef[];
  /**
   * Ids of every row matching the current filters, across all pages — or
   * `null` when more than ADMIN_BULK_SELECTION_LIMIT match and
   * `buildTablePage` declined to enumerate them. `null` is NOT `[]`: an empty
   * array is a genuine "nothing matched". See `useAdminTableSelection`, which
   * takes both.
   */
  matchingIds: string[] | null;
  /** Unfiltered total — distinguishes "no testimonials yet" from "no matches". */
  totalTestimonials: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Mirrors `testimonial.bulkDelete`'s `ownerOnlyProcedure`, resolved
   *  server-side. False OMITS the bulk Delete action rather than disabling it. */
  canBulkDelete: boolean;
};

const BASE_PATH = "/admin/testimonials";
const ITEM_NOUN = { one: "testimonial", many: "testimonials" } as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_CHECKBOX = TABLE_HEAD_TIGHT;
const TD_CHECKBOX = TABLE_CELL_TIGHT;

/** "3 of 5" — a bulk op silently touching fewer rows than asked must say so. */
const shortfallMessage = createShortfallMessage(ITEM_NOUN);

const STATUS_LABEL: Record<TestimonialStatus, string> = {
  pending: "Pending",
  published: "Published",
  hidden: "Hidden",
};

const STATUS_BADGE_VARIANT: Record<
  TestimonialStatus,
  "secondary" | "success" | "destructive"
> = {
  pending: "secondary",
  published: "success",
  hidden: "destructive",
};

/**
 * `Testimonial.source` is a plain string column in Prisma, not an enum, so
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

export function TestimonialsClient({
  testimonials,
  filters,
  matchingIds,
  totalTestimonials,
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
  const [editingTestimonial, setEditingTestimonial] =
    useState<TestimonialRow | null>(null);
  const [managingImagesTestimonial, setManagingImagesTestimonial] =
    useState<TestimonialRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Selection ──────────────────────────────────────────────────────────────
  // `?tab=` and `?invites=` are part of the hook's filter signature (it derives
  // it from the whole URL minus `page`/`sort`), but they can't strand a stale
  // selection here: switching to the invites tab unmounts this component
  // entirely, so there is nothing left holding selected ids.
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
    rowIds: testimonials.map((testimonial) => testimonial.id),
    matchingIds,
    totalCount,
    page,
    searchParams,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const afterWrite = () => {
    void utils.testimonial.invalidate();
    router.refresh();
  };

  const approveMutation = api.testimonial.approve.useMutation({
    onMutate: loadingToast("Updating testimonial…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        variables.isApproved
          ? "Testimonial approved"
          : "Testimonial unapproved",
      );
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update testimonial");
    },
  });

  const hideMutation = api.testimonial.toggleHidden.useMutation({
    onMutate: loadingToast("Updating testimonial…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        variables.isHidden ? "Testimonial hidden" : "Testimonial unhidden",
      );
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update testimonial");
    },
  });

  const deleteMutation = api.testimonial.delete.useMutation({
    onMutate: loadingToast("Deleting testimonial…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success("Testimonial deleted");
      pruneSelection([variables.id]);
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete testimonial");
    },
  });

  // Separate from `bulkApproveMutation` so undo's own success toast doesn't
  // offer another Undo, which would let the two ping-pong indefinitely.
  const undoApproveMutation = api.testimonial.bulkApprove.useMutation({
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

  const bulkApproveMutation = api.testimonial.bulkApprove.useMutation({
    // Direction-aware, unlike a single "Updating…": approving a queue of
    // pending submissions and pulling published ones back are different enough
    // operations to name while they run.
    onMutate: (variables) => ({
      toastId: toast.loading(
        variables.isApproved
          ? "Approving testimonials…"
          : "Unapproving testimonials…",
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
      toast.error(error.message ?? "Failed to update testimonials");
    },
  });

  // Same split, same reason, for the hide/unhide pair.
  const undoHideMutation = api.testimonial.bulkSetHidden.useMutation({
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

  const bulkHideMutation = api.testimonial.bulkSetHidden.useMutation({
    onMutate: (variables) => ({
      toastId: toast.loading(
        variables.isHidden ? "Hiding testimonials…" : "Unhiding testimonials…",
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
      toast.error(error.message ?? "Failed to update testimonials");
    },
  });

  const bulkDeleteMutation = api.testimonial.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting testimonials…"),
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
      toast.error(error.message ?? "Failed to delete testimonials");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const selectedOnPageRows = testimonials.filter((testimonial) =>
    selectedIds.has(testimonial.id),
  );
  const selectedNames = selectedOnPageRows.map(
    (testimonial) => testimonial.customerName,
  );
  const deleteTarget = testimonials.find(
    (testimonial) => testimonial.id === deleteId,
  );

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

  const hasTestimonials = totalTestimonials > 0;
  const hasResults = testimonials.length > 0;

  return (
    <>
      {!hasTestimonials ? (
        <AdminEmpty
          icon={MessageSquare}
          title="No testimonials yet"
          description="Customer testimonials appear here once they're submitted. You can also add one yourself from another source."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Testimonial
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search testimonials…"
            searchAriaLabel="Search testimonials by name, email, quote, headline, job title or company"
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
              title="No testimonials match your filters"
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
                  <TableCaption className="sr-only">Testimonials</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={`w-10 ${TH_CHECKBOX}`}>
                        <Checkbox
                          id="select-all-testimonials"
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAllOnPage}
                          aria-label="Select all testimonials on this page"
                        />
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        Name
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Quote
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
                    {testimonials.map((testimonial, index) => {
                      const isSelected = selectedIds.has(testimonial.id);
                      const sourceLabel =
                        SOURCE_LABEL[testimonial.source] ?? "Customer";
                      const dateLabel = formatDate(testimonial.testimonialDate);
                      // "Title at Company", with either half allowed to be
                      // missing — joining unconditionally would render a
                      // dangling " at " for a person with a job title and no
                      // employer.
                      const roleLine = [
                        testimonial.customerTitle,
                        testimonial.customerCompany,
                      ]
                        .filter((part): part is string => !!part)
                        .join(" at ");
                      // Rendered in BOTH the desktop Quote column and the
                      // `md:hidden` reflow line — one expression so the
                      // headline emphasis can't drift between the two.
                      const quote = (
                        <>
                          {testimonial.title ? (
                            <span className="font-medium">
                              {testimonial.title}{" "}
                            </span>
                          ) : null}
                          {testimonial.text}
                        </>
                      );

                      return (
                        <TableRow
                          key={testimonial.id}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell className={TD_CHECKBOX}>
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={onRowClickCapture}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select testimonial by ${testimonial.customerName}`}
                            />
                          </TableCell>

                          <TableCell className={`${TD} whitespace-normal`}>
                            <div className="font-medium">
                              {testimonial.customerName}
                            </div>
                            {testimonial.customerEmail && (
                              <div className="text-muted-foreground text-sm">
                                {testimonial.customerEmail}
                              </div>
                            )}
                            {roleLine && (
                              <div className="text-muted-foreground text-sm">
                                {roleLine}
                              </div>
                            )}

                            {/* Below md the Quote/Source/Status/Date columns
                                are hidden — reflow them here. */}
                            <div className="mt-1 md:hidden">
                              <p className="line-clamp-2 text-sm">{quote}</p>
                              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                                <span>{sourceLabel}</span>
                                <span aria-hidden="true">·</span>
                                <span>{STATUS_LABEL[testimonial.status]}</span>
                                <span aria-hidden="true">·</span>
                                <span>{dateLabel}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell
                            className={`hidden md:table-cell ${TD} max-w-md whitespace-normal`}
                          >
                            {/* Foreground, not muted: the quote is the content
                                the owner is moderating, not a secondary
                                attribute of the row. */}
                            <p className="line-clamp-2">{quote}</p>
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {sourceLabel}
                          </TableCell>

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            <Badge
                              variant={STATUS_BADGE_VARIANT[testimonial.status]}
                            >
                              {STATUS_LABEL[testimonial.status]}
                            </Badge>
                          </TableCell>

                          {/* One date column, always `testimonialDate` — the
                              key the list actually sorts by. The old card list
                              showed a relative `createdAt` ("3 days ago") for
                              customer rows while sorting by `testimonialDate`,
                              so the visible date and the sort order could
                              disagree. Nothing meaningful is lost: customer
                              submissions set `testimonialDate` to now() on
                              submit, so for those rows the two are the same
                              instant. */}
                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {dateLabel}
                          </TableCell>

                          <TableCell className={`${TD} text-right`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">
                                    Actions for {testimonial.customerName}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {/* Only owner-added rows are editable — a
                                    customer's own words are not the owner's to
                                    rewrite. */}
                                {testimonial.source === "owner" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setEditingTestimonial(testimonial)
                                      }
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}

                                {testimonial.photoUrls.length > 0 && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setManagingImagesTestimonial(
                                          testimonial,
                                        )
                                      }
                                    >
                                      <ImageIcon className="mr-2 h-4 w-4" />
                                      Manage images
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}

                                {/* Approve/Unapprove are offered only from the
                                    two visible states. A hidden row gets
                                    NEITHER — the preserved rule from the old
                                    list: while `isHidden` is true the approval
                                    flag changes nothing a shopper can see, so
                                    offering it would be a control with no
                                    observable effect. Unhide first. */}
                                {testimonial.status === "pending" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      approveMutation.mutate({
                                        id: testimonial.id,
                                        isApproved: true,
                                      })
                                    }
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    Approve
                                  </DropdownMenuItem>
                                )}

                                {testimonial.status === "published" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      approveMutation.mutate({
                                        id: testimonial.id,
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
                                      id: testimonial.id,
                                      isHidden: !testimonial.isHidden,
                                    })
                                  }
                                >
                                  {testimonial.isHidden ? (
                                    <Eye className="mr-2 h-4 w-4" />
                                  ) : (
                                    <EyeOff className="mr-2 h-4 w-4" />
                                  )}
                                  {testimonial.isHidden ? "Unhide" : "Hide"}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(testimonial.id)}
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
          survives the moment the first testimonial lands and the table
          replaces the empty state. */}
      <OwnerTestimonialDialog
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
      {editingTestimonial && (
        <OwnerTestimonialDialog
          testimonial={editingTestimonial}
          isOpen
          onClose={() => setEditingTestimonial(null)}
          onSuccess={() => {
            setEditingTestimonial(null);
            afterWrite();
          }}
        />
      )}

      {/* Manage images dialog. It owns its own `updatePhotoUrls` mutation and
          calls `onClose` itself after a successful save — this only has to
          drop the row reference and refresh. */}
      <ManageTestimonialImagesDialog
        testimonial={managingImagesTestimonial}
        open={!!managingImagesTestimonial}
        onClose={() => setManagingImagesTestimonial(null)}
        onSuccess={() => {
          setManagingImagesTestimonial(null);
          afterWrite();
        }}
      />

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the testimonial
              {deleteTarget ? ` from ${deleteTarget.customerName}` : ""}, and it
              will disappear from your storefront immediately. This action
              cannot be undone.
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
                bug the old testimonials list shipped). */}
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
              Delete {selectedCount}{" "}
              {selectedCount === 1 ? "testimonial" : "testimonials"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(selectedNames, selectedCount, ITEM_NOUN)}.{" "}
              {selectedCount === 1 ? "It" : "They"} will disappear from your
              storefront immediately, and any photos stay in your media library.
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
                    selectedCount === 1 ? "testimonial" : "testimonials"
                  }`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
