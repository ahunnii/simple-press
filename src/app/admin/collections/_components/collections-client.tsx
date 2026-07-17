"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
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
import { Input } from "~/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
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

import { AdminEmpty } from "../../_components/admin-empty";

type Collection = RouterOutputs["collections"]["getAll"][number];

type Props = {
  collections: RouterOutputs["collections"]["getAll"];
};

const PAGE_SIZE = 12;

type FilterValue = "all" | "published" | "draft";

export function CollectionsClient({ collections }: Props) {
  const utils = api.useUtils();
  const router = useRouter();

  // Single-delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Bulk delete confirmation state
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Search / filter / pagination state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [page, setPage] = useState(1);

  // Selection state (id-based — survives pagination)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteMutation = api.collections.delete.useMutation({
    onMutate: () => {
      toast.loading("Deleting collection...");
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Collection deleted successfully");
      void utils.collections.invalidate();
      router.refresh();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to delete collection");
    },
  });

  const duplicateMutation = api.collections.duplicate.useMutation({
    onMutate: () => {
      toast.loading("Duplicating collection...");
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Collection duplicated — draft saved");
      void utils.collections.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to duplicate collection");
    },
  });

  const bulkPublishMutation = api.collections.bulkSetPublished.useMutation({
    onMutate: () => {
      toast.loading("Updating collections...");
    },
    onSuccess: (data, variables) => {
      toast.dismiss();
      const verb = variables.published ? "published" : "unpublished";
      toast.success(
        `${data.count} ${data.count === 1 ? "collection" : "collections"} ${verb}`,
      );
      void utils.collections.invalidate();
      router.refresh();
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update collections");
    },
  });

  const bulkDeleteMutation = api.collections.bulkDelete.useMutation({
    onMutate: () => {
      toast.loading("Deleting collections...");
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(
        `${data.count} ${data.count === 1 ? "collection" : "collections"} deleted`,
      );
      void utils.collections.invalidate();
      router.refresh();
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to delete collections");
    },
  });

  // ── Filtering + pagination ─────────────────────────────────────────────────

  const filtered = collections.filter((c: Collection) => {
    const matchesSearch =
      search.trim() === "" ||
      c.name.toLowerCase().includes(search.trim().toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "published" && c.published) ||
      (filter === "draft" && !c.published);

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp page so that filter/search changes don't leave us past the last page
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (value: FilterValue) => {
    setFilter(value);
    setPage(1);
  };

  // ── Selection helpers ──────────────────────────────────────────────────────

  const filteredIds = filtered.map((c) => c.id);
  const selectedInFiltered = filteredIds.filter((id) => selectedIds.has(id));
  const allFilteredSelected =
    filteredIds.length > 0 && selectedInFiltered.length === filteredIds.length;
  const someFilteredSelected =
    selectedInFiltered.length > 0 && !allFilteredSelected;

  const toggleCard = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered items
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
    } else {
      // Select all filtered items (adds to any existing cross-filter selection)
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.add(id);
        return next;
      });
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate(id);
  };

  const handleBulkPublish = (published: boolean) => {
    bulkPublishMutation.mutate({ ids: [...selectedIds], published });
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate({ ids: [...selectedIds] });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasCollections = collections.length > 0;
  const hasResults = filtered.length > 0;
  const isFiltering = search.trim() !== "" || filter !== "all";
  const hasSelection = selectedIds.size > 0;
  const isBulkPending =
    bulkPublishMutation.isPending || bulkDeleteMutation.isPending;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Collections</h1>
          <p>Organize your products into collections</p>
        </div>
        <Button asChild>
          <Link href="/admin/collections/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Collection
          </Link>
        </Button>
      </div>

      {/* Absolute empty state — no collections at all */}
      {!hasCollections ? (
        <AdminEmpty
          icon={FolderOpen}
          title="No collections yet"
          description="Group related products together so shoppers can browse by category, season, or any theme that fits your store."
          action={
            <Button asChild>
              <Link href="/admin/collections/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Collection
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Search + Filter bar (sticky so it stays reachable while scrolling) */}
          <div className="bg-card sticky top-0 z-20 mb-6 rounded-lg border p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search collections..."
                  aria-label="Search collections"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Published / Draft filter */}
              <div className="w-full md:w-44">
                <Select
                  value={filter}
                  onValueChange={(v) => handleFilterChange(v as FilterValue)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All collections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Collections</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Result count */}
              {isFiltering && (
                <div className="flex items-center">
                  <span className="text-muted-foreground text-sm">
                    {filtered.length}{" "}
                    {filtered.length === 1 ? "result" : "results"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bulk action bar */}
          {hasSelection && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <span className="text-sm font-medium text-blue-800">
                {selectedIds.size}{" "}
                {selectedIds.size === 1 ? "collection" : "collections"} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkPublish(true)}
                  disabled={isBulkPending}
                  className="border-blue-300 bg-white text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Publish</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkPublish(false)}
                  disabled={isBulkPending}
                  className="border-blue-300 bg-white text-blue-700 hover:bg-blue-50"
                >
                  <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Unpublish</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={isBulkPending}
                  className="border-destructive/30 bg-card text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
              <button
                className="text-primary ml-auto text-sm underline-offset-2 hover:underline"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          )}

          {/* No-match empty state */}
          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title="No collections match your filters"
              description="Try adjusting your search or status filter to find what you're looking for."
              filtered
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              {/* Collections Table */}
              <Card>
                <Table>
                  <TableCaption className="sr-only">Collections</TableCaption>
                  <TableHeader>
                    <TableRow>
                      {/* Select-all */}
                      <TableHead scope="col" className="w-10">
                        <Checkbox
                          id="select-all-collections"
                          checked={
                            allFilteredSelected
                              ? true
                              : someFilteredSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all collections"
                          disabled={!hasResults}
                        />
                      </TableHead>
                      <TableHead scope="col">Collection</TableHead>
                      <TableHead scope="col" className="hidden md:table-cell">
                        Products
                      </TableHead>
                      <TableHead scope="col" className="hidden md:table-cell">
                        Status
                      </TableHead>
                      <TableHead scope="col" className="hidden md:table-cell">
                        Storefront
                      </TableHead>
                      <TableHead scope="col">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((collection) => {
                      const isSelected = selectedIds.has(collection.id);
                      return (
                        <TableRow
                          key={collection.id}
                          data-state={isSelected ? "selected" : undefined}
                          onClick={() =>
                            router.push(`/admin/collections/${collection.id}`)
                          }
                          className="cursor-pointer"
                        >
                          {/* Select */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleCard(collection.id)}
                              aria-label={`Select ${collection.name}`}
                            />
                          </TableCell>

                          {/* Collection name + thumbnail */}
                          <TableCell className="whitespace-normal">
                            <div className="flex items-center gap-3">
                              {collection.imageUrl ? (
                                <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded">
                                  <Image
                                    src={collection.imageUrl}
                                    alt=""
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="bg-muted h-10 w-10 shrink-0 rounded" />
                              )}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/admin/collections/${collection.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-medium hover:underline"
                                  >
                                    {collection.name}
                                  </Link>
                                  {!collection.published && (
                                    <Badge
                                      variant="secondary"
                                      className="md:hidden"
                                    >
                                      Draft
                                    </Badge>
                                  )}
                                </div>
                                {collection.description && (
                                  <p className="text-muted-foreground line-clamp-1 text-sm">
                                    {collection.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Products count */}
                          <TableCell className="hidden md:table-cell">
                            {collection._count.collectionProducts}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="hidden md:table-cell">
                            {collection.published ? (
                              <Badge variant="default">Published</Badge>
                            ) : (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                          </TableCell>

                          {/* Storefront link */}
                          <TableCell
                            className="hidden md:table-cell"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {collection.published && collection.slug ? (
                              <a
                                href={`/collections/${collection.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
                                aria-label={`View ${collection.name} on storefront (opens in new tab)`}
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>View</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">
                                    Actions for {collection.name}
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/admin/collections/${collection.id}`}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDuplicate(collection.id)}
                                  disabled={duplicateMutation.isPending}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(collection.id)}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          aria-disabled={safePage <= 1}
                          className={
                            safePage <= 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="text-muted-foreground px-4 text-sm">
                          Page {safePage} of {totalPages}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          aria-disabled={safePage >= totalPages}
                          className={
                            safePage >= totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the collection? This will remove
              the collection but won&apos;t delete the products in it. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
              Delete {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "Collection" : "Collections"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "collection" : "collections"} but
              won&apos;t delete the products in them. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting…"
                : `Delete ${selectedIds.size} ${selectedIds.size === 1 ? "Collection" : "Collections"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
