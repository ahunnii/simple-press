/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Images,
  MoreVertical,
  Pencil,
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

import { AdminEmpty } from "../../_components/admin-empty";
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

type Gallery = RouterOutputs["gallery"]["list"][number];

type Props = {
  galleries: RouterOutputs["gallery"]["list"];
};

const PAGE_SIZE = 12;

type LayoutFilter =
  | "all"
  | "grid"
  | "masonry"
  | "carousel"
  | "collage"
  | "justified";

// A2: layout glyph map — always paired with text so rendered aria-hidden
const LAYOUT_ICONS: Record<string, string> = {
  grid: "⊞",
  masonry: "▦",
  carousel: "⊏",
  collage: "▤",
  justified: "▬",
};

function getLayoutIcon(layout: string) {
  return LAYOUT_ICONS[layout] ?? "⊞";
}

export function GalleriesList({ galleries }: Props) {
  const utils = api.useUtils();
  const router = useRouter();

  // Single-delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Search / filter / pagination state
  const [search, setSearch] = useState("");
  const [layoutFilter, setLayoutFilter] = useState<LayoutFilter>("all");
  const [page, setPage] = useState(1);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteMutation = api.gallery.delete.useMutation({
    onMutate: () => {
      toast.loading("Deleting gallery...");
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Gallery deleted");
      setDeleteId(null);
      void utils.gallery.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to delete gallery");
    },
  });

  const duplicateMutation = api.gallery.duplicate.useMutation({
    onMutate: () => {
      toast.loading("Duplicating gallery...");
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Gallery duplicated");
      void utils.gallery.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to duplicate gallery");
    },
  });

  // ── Filtering + pagination ─────────────────────────────────────────────────

  const filtered = galleries.filter((g: Gallery) => {
    const matchesSearch =
      search.trim() === "" ||
      g.name.toLowerCase().includes(search.trim().toLowerCase());

    const matchesLayout = layoutFilter === "all" || g.layout === layoutFilter;

    return matchesSearch && matchesLayout;
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

  const handleLayoutFilterChange = (value: LayoutFilter) => {
    setLayoutFilter(value);
    setPage(1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasGalleries = galleries.length > 0;
  const hasResults = filtered.length > 0;
  const isFiltering = search.trim() !== "" || layoutFilter !== "all";

  // Absolute empty state — no galleries at all
  if (!hasGalleries) {
    return (
      <AdminEmpty
        icon={Images}
        title="No galleries yet"
        description="Create your first gallery to get started"
        action={
          <Button asChild>
            <Link href="/admin/galleries/new">Create Gallery</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      {/* Search + Layout filter bar */}
      <div className="bg-card sticky top-0 z-20 mb-6 rounded-lg border p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search galleries..."
              aria-label="Search galleries"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Layout filter */}
          <div className="w-full md:w-44">
            <Select
              value={layoutFilter}
              onValueChange={(v) => handleLayoutFilterChange(v as LayoutFilter)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All layouts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Layouts</SelectItem>
                <SelectItem value="grid">
                  <span aria-hidden="true">{LAYOUT_ICONS.grid}</span> Grid
                </SelectItem>
                <SelectItem value="masonry">
                  <span aria-hidden="true">{LAYOUT_ICONS.masonry}</span> Masonry
                </SelectItem>
                <SelectItem value="carousel">
                  <span aria-hidden="true">{LAYOUT_ICONS.carousel}</span>{" "}
                  Carousel
                </SelectItem>
                <SelectItem value="collage">
                  <span aria-hidden="true">{LAYOUT_ICONS.collage}</span> Collage
                </SelectItem>
                <SelectItem value="justified">
                  <span aria-hidden="true">{LAYOUT_ICONS.justified}</span>{" "}
                  Justified
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Result count */}
          {isFiltering && (
            <div className="flex items-center">
              <span className="text-muted-foreground text-sm">
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* No-match empty state */}
      {!hasResults ? (
        <AdminEmpty
          icon={Images}
          title="No matching galleries"
          description="No galleries match your search or filter."
          filtered={true}
        />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginated.map((gallery) => (
              <Card key={gallery.id} className="overflow-hidden">
                {/* Preview Images */}
                <div className="bg-muted grid grid-cols-2 gap-1 p-2">
                  {gallery.images.slice(0, 4).map((image) => (
                    <div
                      key={image.id}
                      className="bg-card aspect-square overflow-hidden rounded"
                    >
                      <img
                        src={image.url}
                        alt={image.altText ?? ""}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                  {gallery.images.length === 0 && (
                    <div className="bg-muted col-span-2 flex aspect-square items-center justify-center rounded">
                      <Images className="text-muted-foreground h-8 w-8" />
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium">{gallery.name}</h3>
                      {gallery.description && (
                        <p className="text-muted-foreground mt-1 truncate text-sm">
                          {gallery.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {/* A2: decorative glyph is aria-hidden */}
                        <Badge variant="outline" className="text-xs">
                          <span aria-hidden="true">
                            {getLayoutIcon(gallery.layout)}
                          </span>{" "}
                          {gallery.layout}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {gallery._count.images} images
                        </Badge>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">
                            Actions for {gallery.name}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/galleries/${gallery.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {/* U2: Duplicate action */}
                        <DropdownMenuItem
                          onClick={() =>
                            duplicateMutation.mutate({ id: gallery.id })
                          }
                          disabled={duplicateMutation.isPending}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(gallery.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the gallery and all its images. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteId) deleteMutation.mutate(deleteId);
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
