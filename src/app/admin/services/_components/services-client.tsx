"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
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
import { Card, CardContent } from "~/components/ui/card";
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

type Service = RouterOutputs["services"]["getAll"][number];

type Props = {
  services: RouterOutputs["services"]["getAll"];
};

const PAGE_SIZE = 12;

type FilterValue = "all" | "published" | "draft";

export function ServicesClient({ services }: Props) {
  const utils = api.useUtils();
  const router = useRouter();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteMutation = api.services.delete.useMutation({
    onMutate: () => toast.loading("Deleting service..."),
    onSuccess: () => {
      toast.dismiss();
      toast.success("Service deleted successfully");
      void utils.services.invalidate();
      router.refresh();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to delete service");
    },
  });

  // Bulk delete
  const bulkDeleteMutation = api.services.delete.useMutation();

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    toast.loading("Deleting services...");
    try {
      await Promise.all(ids.map((id) => bulkDeleteMutation.mutateAsync(id)));
      toast.dismiss();
      toast.success(
        `${ids.length} ${ids.length === 1 ? "service" : "services"} deleted`,
      );
      void utils.services.invalidate();
      router.refresh();
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch {
      toast.dismiss();
      toast.error("Failed to delete some services");
    }
  };

  // ── Filtering + pagination ─────────────────────────────────────────────────

  const filtered = services.filter((s: Service) => {
    const matchesSearch =
      search.trim() === "" ||
      s.name.toLowerCase().includes(search.trim().toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "published" && s.published) ||
      (filter === "draft" && !s.published);

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
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

  const filteredIds = filtered.map((s) => s.id);
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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.add(id);
        return next;
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasServices = services.length > 0;
  const hasResults = filtered.length > 0;
  const isFiltering = search.trim() !== "" || filter !== "all";
  const hasSelection = selectedIds.size > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Services
            </h1>
            <p className="mt-1 text-gray-600">
              Manage your bookable services and service pages
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/services/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Service
            </Link>
          </Button>
        </div>

        {!hasServices ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="mb-4 text-gray-500">No services yet</p>
              <Button asChild>
                <Link href="/admin/services/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Service
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search + Filter bar */}
            <div className="sticky top-0 z-20 mb-6 rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search services..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="w-full md:w-44">
                  <Select
                    value={filter}
                    onValueChange={(v) => handleFilterChange(v as FilterValue)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Drafts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isFiltering && (
                  <span className="text-muted-foreground text-sm">
                    {filtered.length}{" "}
                    {filtered.length === 1 ? "result" : "results"}
                  </span>
                )}
              </div>
            </div>

            {/* Bulk action bar */}
            {hasSelection && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <span className="text-sm font-medium text-blue-800">
                  {selectedIds.size}{" "}
                  {selectedIds.size === 1 ? "service" : "services"} selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkDeleteOpen(true)}
                    className="border-red-300 bg-white text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Delete</span>
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

            {!hasResults ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-500">
                    No services match your search or filter.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <Table>
                    <TableCaption className="sr-only">Services</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col" className="w-10">
                          <Checkbox
                            id="select-all-services"
                            checked={
                              allFilteredSelected
                                ? true
                                : someFilteredSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all services"
                            disabled={!hasResults}
                          />
                        </TableHead>
                        <TableHead scope="col">Service</TableHead>
                        <TableHead scope="col" className="hidden md:table-cell">
                          Items
                        </TableHead>
                        <TableHead scope="col" className="hidden md:table-cell">
                          Template
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
                      {paginated.map((service) => {
                        const isSelected = selectedIds.has(service.id);
                        return (
                          <TableRow
                            key={service.id}
                            data-state={isSelected ? "selected" : undefined}
                            onClick={() =>
                              router.push(`/admin/services/${service.id}`)
                            }
                            className="cursor-pointer"
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleCard(service.id)}
                                aria-label={`Select ${service.name}`}
                              />
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <div className="flex items-center gap-3">
                                {service.image ? (
                                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={service.image}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 shrink-0 rounded bg-gray-100" />
                                )}
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                      href={`/admin/services/${service.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="font-medium hover:underline"
                                    >
                                      {service.name}
                                    </Link>
                                    {!service.published && (
                                      <Badge
                                        variant="secondary"
                                        className="md:hidden"
                                      >
                                        Draft
                                      </Badge>
                                    )}
                                  </div>
                                  {service.description && (
                                    <p className="text-muted-foreground line-clamp-1 text-sm">
                                      {service.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden md:table-cell">
                              {service.items.length}
                            </TableCell>

                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="capitalize">
                                {service.serviceTemplateId.replace(
                                  "service-",
                                  "Template ",
                                )}
                              </Badge>
                            </TableCell>

                            <TableCell className="hidden md:table-cell">
                              {service.published ? (
                                <Badge variant="default">Published</Badge>
                              ) : (
                                <Badge variant="secondary">Draft</Badge>
                              )}
                            </TableCell>

                            <TableCell
                              className="hidden md:table-cell"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {service.published && service.slug ? (
                                <a
                                  href={`/services/${service.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
                                  aria-label={`View ${service.name} on storefront (opens in new tab)`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  <span>View</span>
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>

                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">
                                      Actions for {service.name}
                                    </span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/admin/services/${service.id}`}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setDeleteId(service.id)}
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

        {/* Single Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Service?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this service? All associated
                service items will also be deleted. This action cannot be
                undone.
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

        {/* Bulk Delete Dialog */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {selectedIds.size}{" "}
                {selectedIds.size === 1 ? "Service" : "Services"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedIds.size}{" "}
                {selectedIds.size === 1 ? "service" : "services"} and all their
                associated items. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void handleBulkDelete()}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete {selectedIds.size}{" "}
                {selectedIds.size === 1 ? "Service" : "Services"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
