"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  Download,
  Eye,
  Inbox,
  Mail,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { BulkAction } from "../../../../_components/admin-bulk-bar";
import type { FormAnswerSnapshot } from "~/lib/forms/answers";
import type {
  FormField,
  FormStatus,
  FormStatusFilterValue,
} from "~/lib/validators/form";
import type { RouterOutputs } from "~/trpc/react";
import { downloadCsv } from "~/lib/csv-download";
import { formatAnswerOrDash } from "~/lib/forms/answers";
import { formatDate } from "~/lib/format-date";
import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";
import {
  FORM_STATUS_FILTER_VALUES,
  FORM_STATUS_LABELS,
  FORM_STATUS_VALUES,
} from "~/lib/validators/form";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { AdminBulkBar } from "../../../../_components/admin-bulk-bar";
import { AdminEmpty } from "../../../../_components/admin-empty";
import { AdminFilters } from "../../../../_components/admin-filters";
import { AdminPagination } from "../../../../_components/admin-pagination";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_CELL_TIGHT,
  TABLE_HEAD,
  TABLE_HEAD_TIGHT,
} from "../../../../_components/admin-table-style";
import {
  createCapDisabledReason,
  createOverCapGuard,
  createShortfallMessage,
  describeSelection,
} from "../../../../_lib/admin-bulk-actions";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../../../_lib/admin-mutation-toast";
import { useAdminTableSelection } from "../../../../_lib/use-admin-table-selection";
import { ImportEntriesDialog } from "./import-entries-dialog";

type EntryRow = RouterOutputs["formSubmission"]["list"]["items"][number];

type Props = {
  formId: string;
  formName: string;
  /** Lifetime entry count for the form, ignoring filters. */
  totalEntries: number;
  /** Every field, in definition order — used for the first-3-columns table. */
  fields: FormField[];
  /** Choice/checkbox fields only — the per-field filter picks from these. */
  filterableFields: FormField[];
  tagOptions: string[];
  items: EntryRow[];
  total: number;
  page: number;
  pageSize: number;
  scanCapped: boolean;
  /** Mirrors `formSubmission.bulkDelete`'s `ownerOnlyProcedure`. */
  canBulkDelete: boolean;
};

const ITEM_NOUN = { one: "entry", many: "entries" } as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;
const TH_CHECKBOX = TABLE_HEAD_TIGHT;
const TD_CHECKBOX = TABLE_CELL_TIGHT;

const shortfallMessage = createShortfallMessage(ITEM_NOUN);

const STATUS_BADGE_VARIANT: Record<
  FormStatus,
  "default" | "secondary" | "outline"
> = {
  NEW: "default",
  READ: "secondary",
  ARCHIVED: "outline",
};

const STATUS_VERB: Record<FormStatus, string> = {
  NEW: "new",
  READ: "read",
  ARCHIVED: "archived",
};

function basePath(formId: string) {
  return `/admin/forms/${formId}/entries`;
}

/** `status` is a plain `String` column (not a DB enum), written exclusively
 *  through validated procedures — same reasoning as `toQuoteStatus` in the
 *  quotes list page. Falls back to "NEW" rather than throwing on a
 *  corrupted row. */
function toFormStatus(status: string): FormStatus {
  const values: readonly string[] = FORM_STATUS_VALUES;
  return values.includes(status) ? (status as FormStatus) : "NEW";
}

/** The value a per-field filter matches against — an option's label for a
 *  choice field, "Yes"/"No" for a checkbox (mirrors `snapshotMatchesFieldFilter`). */
function filterValueOptions(field: FormField): { value: string; label: string }[] {
  if (field.type === "checkbox") {
    return [
      { value: "Yes", label: "Yes" },
      { value: "No", label: "No" },
    ];
  }
  if ("options" in field) {
    return field.options.map((option) => ({
      value: option.label,
      label: option.label,
    }));
  }
  return [];
}

function answerCell(answers: FormAnswerSnapshot[], fieldId: string): string {
  const snapshot = answers.find((a) => a.fieldId === fieldId);
  const text = snapshot ? formatAnswerOrDash(snapshot) : "—";
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

export function EntriesClient({
  formId,
  formName,
  totalEntries,
  fields,
  filterableFields,
  tagOptions,
  items,
  total,
  page,
  pageSize,
  scanCapped,
  canBulkDelete,
}: Props) {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [addTagOpen, setAddTagOpen] = useState(false);
  const [removeTagOpen, setRemoveTagOpen] = useState(false);

  const columnFields = fields.slice(0, 3);

  const {
    selectedIds,
    selectedCount,
    allPageSelected,
    somePageSelected,
    clearSelection,
    pruneSelection,
    handleRowToggle,
    handleSelectAllOnPage,
    onRowClickCapture,
    onFiltersChange,
  } = useAdminTableSelection({
    rowIds: items.map((item) => item.id),
    // The router paginates in Postgres rather than fetching every matching
    // row (unlike Quotes' in-memory `buildTablePage`), so there is no full
    // matching-id list to enumerate — "select all N matching" is not offered,
    // only per-page selection.
    matchingIds: null,
    totalCount: total,
    page,
    searchParams,
  });

  const afterWrite = () => {
    void utils.formSubmission.invalidate();
    void utils.form.invalidate();
    router.refresh();
  };

  const bulkStatusMutation = api.formSubmission.bulkSetStatus.useMutation({
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
        toast.success(
          `${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many} marked ${verb}`,
        );
      }
      pruneSelection(variables.ids);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update entries");
    },
  });

  const bulkAddTagsMutation = api.formSubmission.bulkAddTags.useMutation({
    onMutate: loadingToast("Adding tag…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        `Tag added to ${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many}`,
      );
      setAddTagOpen(false);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to add tag");
    },
  });

  const bulkRemoveTagsMutation = api.formSubmission.bulkRemoveTags.useMutation({
    onMutate: loadingToast("Removing tag…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        `Tag removed from ${data.count} ${data.count === 1 ? ITEM_NOUN.one : ITEM_NOUN.many}`,
      );
      setRemoveTagOpen(false);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to remove tag");
    },
  });

  const bulkDeleteMutation = api.formSubmission.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting entries…"),
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
      toast.error(error.message ?? "Failed to delete entries");
    },
  });

  const exportMutation = api.formSubmission.exportCsv.useMutation({
    onSuccess: (data) => {
      downloadCsv(data.csv, data.filename);
    },
    onError: (error) => {
      if (error.data?.code === "NOT_FOUND") {
        toast.error("No entries match these filters");
      } else {
        toast.error(error.message ?? "Failed to export entries");
      }
    },
  });

  const selectedOnPageRows = items.filter((item) => selectedIds.has(item.id));

  const overCap = createOverCapGuard(selectedCount, ITEM_NOUN);
  const capReason = createCapDisabledReason(selectedCount, ITEM_NOUN);
  const deleteCapReason = capReason(ADMIN_BULK_DELETE_LIMIT, "delete");

  const handleBulkStatus = (status: FormStatus) => {
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

  const isBulkPending =
    bulkStatusMutation.isPending ||
    bulkAddTagsMutation.isPending ||
    bulkRemoveTagsMutation.isPending ||
    bulkDeleteMutation.isPending;

  const bulkActions: BulkAction[] = [
    {
      label: "Mark read",
      icon: Eye,
      onClick: () => handleBulkStatus("READ"),
      pending:
        bulkStatusMutation.isPending &&
        bulkStatusMutation.variables?.status === "READ",
    },
    {
      label: "Mark new",
      icon: Mail,
      onClick: () => handleBulkStatus("NEW"),
      pending:
        bulkStatusMutation.isPending &&
        bulkStatusMutation.variables?.status === "NEW",
    },
    {
      label: "Archive",
      icon: Archive,
      onClick: () => handleBulkStatus("ARCHIVED"),
      pending:
        bulkStatusMutation.isPending &&
        bulkStatusMutation.variables?.status === "ARCHIVED",
    },
    {
      label: "Add tag",
      icon: Tag,
      onClick: () => {
        if (selectedCount === 0 || overCap(ADMIN_BULK_SELECTION_LIMIT, "tag")) {
          return;
        }
        setAddTagOpen(true);
      },
      pending: bulkAddTagsMutation.isPending,
    },
    ...(tagOptions.length > 0
      ? [
          {
            label: "Remove tag",
            icon: X,
            onClick: () => {
              if (
                selectedCount === 0 ||
                overCap(ADMIN_BULK_SELECTION_LIMIT, "untag")
              ) {
                return;
              }
              setRemoveTagOpen(true);
            },
            pending: bulkRemoveTagsMutation.isPending,
          },
        ]
      : []),
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

  const handleExport = () => {
    const status = searchParams.get("status") ?? "ALL";
    const tags = searchParams.get("tags");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search")?.trim();
    const filterField = searchParams.get("filterField");
    const filterValue = searchParams.get("filterValue");
    exportMutation.mutate({
      formId,
      status: (FORM_STATUS_FILTER_VALUES as readonly string[]).includes(status)
        ? (status as FormStatusFilterValue)
        : "ALL",
      tags: tags
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59.999`) : undefined,
      search: search === "" ? undefined : search,
      fieldFilter:
        filterField && filterValue
          ? { fieldId: filterField, value: filterValue }
          : undefined,
    });
  };

  const hasEntries = totalEntries > 0;
  const hasResults = items.length > 0;

  const activeTags = (searchParams.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const activeFrom = searchParams.get("from") ?? "";
  const activeTo = searchParams.get("to") ?? "";
  const activeFilterFieldId = searchParams.get("filterField") ?? "";
  const activeFilterValue = searchParams.get("filterValue") ?? "";
  const activeFilterField = filterableFields.find(
    (f) => f.id === activeFilterFieldId,
  );

  const moreFiltersActiveCount =
    (activeTags.length > 0 ? 1 : 0) +
    (activeFrom || activeTo ? 1 : 0) +
    (activeFilterField && activeFilterValue ? 1 : 0);

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>{formName} — Entries</h1>
          <p>
            {totalEntries} {totalEntries === 1 ? "entry" : "entries"} collected
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" asChild>
            <Link href={`/admin/forms/${formId}`}>Edit form</Link>
          </Button>
          <ImportEntriesDialog
            formId={formId}
            trigger={
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            }
          />
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {!hasEntries ? (
        <AdminEmpty
          icon={Inbox}
          title="No entries yet"
          description="Entries land here as soon as a visitor submits this form. Publish the form to start collecting them."
          action={
            <Button variant="outline" asChild>
              <Link href={`/admin/forms/${formId}`}>Edit form</Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={basePath(formId)}
            searchPlaceholder="Search entries…"
            searchAriaLabel="Search entries by answer text"
            filters={[
              {
                key: "status",
                label: "Status",
                defaultValue: "ALL",
                options: [
                  { value: "ALL", label: "All statuses" },
                  ...FORM_STATUS_VALUES.map((value) => ({
                    value,
                    label: FORM_STATUS_LABELS[value],
                  })),
                ],
              },
            ]}
            resultCount={total}
            itemNoun={ITEM_NOUN}
            onFiltersChange={onFiltersChange}
          />

          {/* More filters — tags, date range, per-field — AdminFilters only
              supports single-value selects, so these live in a small popover
              beside it and write the same URL params. */}
          <div className="mb-6 -mt-3 flex flex-wrap items-center gap-2">
            <Popover open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  More filters
                  {moreFiltersActiveCount > 0 && (
                    <span className="bg-primary text-primary-foreground ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums">
                      {moreFiltersActiveCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80">
                <MoreFiltersForm
                  formId={formId}
                  tagOptions={tagOptions}
                  filterableFields={filterableFields}
                  onApplied={() => setMoreFiltersOpen(false)}
                />
              </PopoverContent>
            </Popover>

            {activeTags.map((tag) => (
              <FilterChip
                key={`tag-${tag}`}
                label="Tag"
                value={tag}
                onRemove={() => {
                  const next = activeTags.filter((t) => t !== tag);
                  navigateWithParams(router, basePath(formId), searchParams, {
                    tags: next.length > 0 ? next.join(",") : null,
                  });
                  onFiltersChange(["tags"]);
                }}
              />
            ))}
            {(activeFrom || activeTo) && (
              <FilterChip
                label="Date"
                value={`${activeFrom || "…"} – ${activeTo || "…"}`}
                onRemove={() => {
                  navigateWithParams(router, basePath(formId), searchParams, {
                    from: null,
                    to: null,
                  });
                  onFiltersChange(["from", "to"]);
                }}
              />
            )}
            {activeFilterField && activeFilterValue && (
              <FilterChip
                label={activeFilterField.label}
                value={activeFilterValue}
                onRemove={() => {
                  navigateWithParams(router, basePath(formId), searchParams, {
                    filterField: null,
                    filterValue: null,
                  });
                  onFiltersChange(["filterField", "filterValue"]);
                }}
              />
            )}
          </div>

          {scanCapped && (
            <p className="text-muted-foreground mb-4 text-xs">
              Search checked the most recent 10,000 entries — narrow by date,
              status or tag to search older ones.
            </p>
          )}

          <AdminBulkBar
            count={selectedCount}
            itemNoun={ITEM_NOUN}
            actions={bulkActions}
            onClear={clearSelection}
            disabled={isBulkPending}
          />

          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title="No entries match your filters"
              filtered
              action={
                <Button variant="outline" asChild>
                  <Link href={basePath(formId)}>Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <Card className={TABLE_CARD}>
                <Table>
                  <TableCaption className="sr-only">Entries</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={`w-10 ${TH_CHECKBOX}`}>
                        <Checkbox
                          id="select-all-entries"
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAllOnPage}
                          aria-label="Select all entries on this page"
                        />
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        Submitted
                      </TableHead>
                      <TableHead scope="col" className={TH}>
                        Status
                      </TableHead>
                      {columnFields.map((field) => (
                        <TableHead
                          key={field.id}
                          scope="col"
                          className={`hidden md:table-cell ${TH}`}
                        >
                          {field.label}
                        </TableHead>
                      ))}
                      <TableHead
                        scope="col"
                        className={`hidden md:table-cell ${TH}`}
                      >
                        Tags
                      </TableHead>
                      <TableHead scope="col" className={`${TH} text-right`}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => {
                      const isSelected = selectedIds.has(item.id);
                      const detailHref = `${basePath(formId)}/${item.id}`;
                      const status = toFormStatus(item.status);

                      return (
                        <TableRow
                          key={item.id}
                          data-state={isSelected ? "selected" : undefined}
                          className="cursor-pointer"
                          onClick={(e) => {
                            // Ignore clicks that originated on an interactive
                            // element inside the row (checkbox, links).
                            if (
                              e.target instanceof HTMLElement &&
                              e.target.closest("a, button, input")
                            ) {
                              return;
                            }
                            router.push(detailHref);
                          }}
                        >
                          <TableCell
                            className={TD_CHECKBOX}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onClickCapture={onRowClickCapture}
                              onCheckedChange={() => handleRowToggle(index)}
                              aria-label={`Select entry submitted ${formatDate(item.submittedAt)}`}
                            />
                          </TableCell>

                          <TableCell className={`${TD} whitespace-normal`}>
                            <div className="min-w-0">
                              <Link
                                href={detailHref}
                                className="font-medium hover:underline"
                              >
                                {formatDate(item.submittedAt)}
                              </Link>
                              {item.source === "IMPORT" && (
                                <div className="mt-0.5">
                                  <Badge variant="secondary">Imported</Badge>
                                </div>
                              )}
                              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                                <span>{FORM_STATUS_LABELS[status]}</span>
                                {columnFields.map((field) => (
                                  <span key={field.id}>
                                    <span aria-hidden="true">·</span>{" "}
                                    {answerCell(item.answers, field.id)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className={TD}>
                            <Badge
                              variant={STATUS_BADGE_VARIANT[status]}
                              className={
                                status === "NEW" ? "font-semibold" : undefined
                              }
                            >
                              {FORM_STATUS_LABELS[status]}
                            </Badge>
                          </TableCell>

                          {columnFields.map((field) => (
                            <TableCell
                              key={field.id}
                              className={`hidden md:table-cell ${TD}`}
                            >
                              {answerCell(item.answers, field.id)}
                            </TableCell>
                          ))}

                          <TableCell className={`hidden md:table-cell ${TD}`}>
                            {item.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.tags.map((tag) => (
                                  <Badge key={tag} variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className={`${TD} text-right`}>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={detailHref}>
                                <Eye
                                  aria-hidden="true"
                                  className="mr-2 h-4 w-4"
                                />
                                View
                                <span className="sr-only">
                                  {" "}
                                  entry submitted {formatDate(item.submittedAt)}
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
                totalPages={Math.max(1, Math.ceil(total / pageSize))}
                totalCount={total}
                pageSize={pageSize}
                basePath={basePath(formId)}
                itemNoun={ITEM_NOUN}
              />
            </>
          )}
        </>
      )}

      {/* Add tag */}
      <TagMutationDialog
        open={addTagOpen}
        onOpenChange={setAddTagOpen}
        title={`Add a tag to ${selectedCount} ${selectedCount === 1 ? "entry" : "entries"}`}
        description="Existing tags on these entries are kept — this adds one on top."
        tagOptions={tagOptions}
        confirmLabel="Add tag"
        pending={bulkAddTagsMutation.isPending}
        onConfirm={(tag) =>
          bulkAddTagsMutation.mutate({ ids: [...selectedIds], tags: [tag] })
        }
      />

      {/* Remove tag */}
      <TagMutationDialog
        open={removeTagOpen}
        onOpenChange={setRemoveTagOpen}
        title={`Remove a tag from ${selectedCount} ${selectedCount === 1 ? "entry" : "entries"}`}
        description="Pick one of the tags already used on this form."
        tagOptions={tagOptions}
        confirmLabel="Remove tag"
        pending={bulkRemoveTagsMutation.isPending}
        requireExisting
        onConfirm={(tag) =>
          bulkRemoveTagsMutation.mutate({ ids: [...selectedIds], tags: [tag] })
        }
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} {selectedCount === 1 ? "entry" : "entries"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              {describeSelection(
                selectedOnPageRows.map((row) => formatDate(row.submittedAt)),
                selectedCount,
                ITEM_NOUN,
              )}
              . Their answers will be gone for good. This action cannot be
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
                    selectedCount === 1 ? "entry" : "entries"
                  }`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Merge `overrides` into the current URL's search params (null deletes) and
 *  navigate, always resetting `page` — same contract as AdminFilters' own
 *  `buildParams`/`navigate`, duplicated here because this lives outside it. */
function navigateWithParams(
  router: ReturnType<typeof useRouter>,
  path: string,
  searchParams: ReturnType<typeof useSearchParams>,
  overrides: Record<string, string | null>,
) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  router.push(qs ? `${path}?${qs}` : path);
}

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="bg-muted text-foreground inline-flex h-8 items-center gap-1.5 rounded-full py-1 pr-1 pl-3 text-xs font-medium">
      <span className="text-muted-foreground">{label}:</span>
      <span className="max-w-[14rem] truncate">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="text-muted-foreground hover:bg-background hover:text-foreground grid size-6 shrink-0 place-items-center rounded-full transition-colors"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  );
}

function MoreFiltersForm({
  formId,
  tagOptions,
  filterableFields,
  onApplied,
}: {
  formId: string;
  tagOptions: string[];
  filterableFields: FormField[];
  onApplied: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTags = (searchParams.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [filterFieldId, setFilterFieldId] = useState(
    searchParams.get("filterField") ?? "",
  );
  const [filterValue, setFilterValue] = useState(
    searchParams.get("filterValue") ?? "",
  );

  const filterField = filterableFields.find((f) => f.id === filterFieldId);
  const valueOptions = filterField ? filterValueOptions(filterField) : [];

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleApply = () => {
    navigateWithParams(router, basePath(formId), searchParams, {
      tags: tags.length > 0 ? tags.join(",") : null,
      from: from || null,
      to: to || null,
      filterField: filterField && filterValue ? filterField.id : null,
      filterValue: filterField && filterValue ? filterValue : null,
    });
    onApplied();
  };

  const handleReset = () => {
    setTags([]);
    setFrom("");
    setTo("");
    setFilterFieldId("");
    setFilterValue("");
    navigateWithParams(router, basePath(formId), searchParams, {
      tags: null,
      from: null,
      to: null,
      filterField: null,
      filterValue: null,
    });
    onApplied();
  };

  return (
    <div className="flex flex-col gap-4">
      {tagOptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  tags.includes(tag)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent hover:bg-accent"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="entries-filter-from">Date range</Label>
        <div className="flex items-center gap-2">
          <Input
            id="entries-filter-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
          />
        </div>
      </div>

      {filterableFields.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Field filter</Label>
          <Select
            value={filterFieldId || "none"}
            onValueChange={(value) => {
              setFilterFieldId(value === "none" ? "" : value);
              setFilterValue("");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Any field</SelectItem>
              {filterableFields.map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filterField && (
            <Select value={filterValue || "none"} onValueChange={setFilterValue}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a value" />
              </SelectTrigger>
              <SelectContent>
                {valueOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
          Reset
        </Button>
        <Button type="button" size="sm" onClick={handleApply}>
          Apply filters
        </Button>
      </div>
    </div>
  );
}

function TagMutationDialog({
  open,
  onOpenChange,
  title,
  description,
  tagOptions,
  confirmLabel,
  pending,
  requireExisting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  tagOptions: string[];
  confirmLabel: string;
  pending: boolean;
  /** True for "remove tag": only an existing tag can be picked, no free text. */
  requireExisting?: boolean;
  onConfirm: (tag: string) => void;
}) {
  const [tag, setTag] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setTag("");
    onOpenChange(next);
  };

  const trimmed = tag.trim();
  const canConfirm =
    trimmed !== "" && (!requireExisting || tagOptions.includes(trimmed));

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          {!requireExisting && (
            <div className="flex gap-2">
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Tag name"
                maxLength={40}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canConfirm) {
                    e.preventDefault();
                    onConfirm(trimmed);
                  }
                }}
              />
            </div>
          )}
          {tagOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tagOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTag(option)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    trimmed === option
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent hover:bg-accent"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : requireExisting ? (
            <p className="text-muted-foreground text-sm">
              No tags on this form yet.
            </p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(trimmed)}
            disabled={!canConfirm || pending}
          >
            {pending ? "Saving…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
