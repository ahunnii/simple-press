"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  EyeOff,
  Eye,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
    filteredIds.length > 0 &&
    selectedInFiltered.length === filteredIds.length;
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Collections
            </h1>
            <p className="mt-1 text-gray-600">
              Organize your products into collections
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/collections/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Collection
            </Link>
          </Button>
        </div>

        {/* Absolute empty state — no collections at all */}
        {!hasCollections ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="mb-4 text-gray-500">No collections yet</p>
              <Button asChild>
                <Link href="/admin/collections/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Collection
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search + Filter bar (sticky so it stays reachable while scrolling) */}
            <div className="sticky top-0 z-20 mb-6 rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Select-all checkbox */}
                <div className="flex items-center gap-2">
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
                  <label
                    htmlFor="select-all-collections"
                    className="cursor-pointer text-sm text-gray-600 md:sr-only"
                  >
                    Select all
                  </label>
                </div>

                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search collections..."
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
                  {selectedIds.size === 1 ? "collection" : "collections"}{" "}
                  selected
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
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkPublish(false)}
                    disabled={isBulkPending}
                    className="border-blue-300 bg-white text-blue-700 hover:bg-blue-50"
                  >
                    <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                    Unpublish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkDeleteOpen(true)}
                    disabled={isBulkPending}
                    className="border-red-300 bg-white text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
                <button
                  className="ml-auto text-sm text-blue-600 underline-offset-2 hover:underline"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </button>
              </div>
            )}

            {/* No-match empty state */}
            {!hasResults ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-500">
                    No collections match your search or filter.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Collections Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {paginated.map((collection) => {
                    const isSelected = selectedIds.has(collection.id);
                    return (
                      <Card
                        key={collection.id}
                        onClick={() =>
                          router.push(`/admin/collections/${collection.id}`)
                        }
                        className={`cursor-pointer overflow-hidden transition-shadow hover:shadow-md ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                      >
                        {collection.imageUrl && (
                          <div className="relative h-48 bg-gray-100">
                            {/* Checkbox overlay on image */}
                            <div
                              className="absolute top-2 left-2 z-10 p-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  toggleCard(collection.id)
                                }
                                aria-label={`Select ${collection.name}`}
                                className="h-5 w-5 border-white bg-white/90 shadow-sm"
                              />
                            </div>
                            <Image
                              src={collection.imageUrl}
                              alt={collection.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}

                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            {/* Checkbox shown when no image */}
                            {!collection.imageUrl && (
                              <div
                                className="shrink-0 p-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleCard(collection.id)
                                  }
                                  aria-label={`Select ${collection.name}`}
                                  className="h-5 w-5"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                <Link
                                  href={`/admin/collections/${collection.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="hover:underline"
                                >
                                  {collection.name}
                                </Link>
                              </CardTitle>
                              <CardDescription className="mt-1 line-clamp-2">
                                {collection.description ?? "No description"}
                              </CardDescription>
                            </div>
                            {!collection.published && (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                              {collection._count.collectionProducts} products
                            </p>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
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
                                  onClick={() =>
                                    handleDuplicate(collection.id)
                                  }
                                  disabled={duplicateMutation.isPending}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setDeleteId(collection.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex flex-col items-center gap-2">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setPage((p) => Math.max(1, p - 1))
                            }
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
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
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
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={bulkDeleteMutation.isPending}
              >
                Delete {selectedIds.size}{" "}
                {selectedIds.size === 1 ? "Collection" : "Collections"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
