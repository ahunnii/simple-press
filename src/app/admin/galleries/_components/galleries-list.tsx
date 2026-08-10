/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Copy,
  Images,
  Link2,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { AdminFilterDef } from "../../_components/admin-filters";
import type { GalleryLayoutValue } from "~/lib/validators/gallery";
import type { RouterOutputs } from "~/trpc/react";
import { GALLERY_LAYOUT_VALUES } from "~/lib/validators/gallery";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import {
  AdminCardGrid,
  CARD_RAISED,
  CARD_STRETCHED_LINK,
  INTERACTIVE_CARD,
} from "../../_components/admin-card-grid";
import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminPagination } from "../../_components/admin-pagination";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";

type Gallery = RouterOutputs["gallery"]["list"][number];

type Props = {
  /** The current page's cards only — filtering/sorting/paging happen server-side. */
  galleries: Gallery[];
  /** Where each gallery is embedded outside its own listing. An ABSENT key means
   *  "not embedded"; the same map the `gallery.delete` guard is built from, so the
   *  badge and the server's CONFLICT can't disagree. */
  usage: Record<string, { count: number; locations: string[] }>;
  /** Unfiltered total — distinguishes "no galleries yet" from "no matches". */
  totalGalleries: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  filters: AdminFilterDef[];
};

const BASE_PATH = "/admin/galleries";
const ITEM_NOUN = { one: "gallery", many: "galleries" } as const;

/**
 * Deliberately NO useAdminTableSelection and NO AdminBulkBar: there are no bulk
 * gallery endpoints, and `gallery.delete` is usage-guarded — it throws CONFLICT
 * for any gallery embedded on the storefront. A bulk delete over a mixed
 * selection would therefore be partial-success by construction: some rows gone,
 * some refused, and one toast trying to explain which. That is a worse tool than
 * deleting them one at a time, where the dialog can name the exact pages
 * blocking each one. The primitives are independently adoptable; this page takes
 * filters, pagination and empty states only, and keeps its card grid (see
 * docs/admin-table-migration.md §7).
 */

/** Layout glyphs, always paired with the text label so they render aria-hidden.
 *  Typed against the model tuple: a layout added to the schema without a glyph
 *  here — or a glyph for a layout that no longer exists — is a compile error. */
const LAYOUT_ICONS = {
  grid: "⊞",
  masonry: "▦",
  carousel: "⊏",
  collage: "▤",
  justified: "▬",
} satisfies Record<GalleryLayoutValue, string>;

const LAYOUT_LABELS = {
  grid: "Grid",
  masonry: "Masonry",
  carousel: "Carousel",
  collage: "Collage",
  justified: "Justified",
} satisfies Record<GalleryLayoutValue, string>;

/** `Gallery.layout` is a Prisma `String`, so a legacy or hand-edited row can hold
 *  a value outside the tuple. Narrow before indexing and fall back rather than
 *  rendering `undefined`. */
function isGalleryLayout(value: string): value is GalleryLayoutValue {
  return (GALLERY_LAYOUT_VALUES as readonly string[]).includes(value);
}

/**
 * Tile geometry for the 3×2 cover mosaic. One tile fills the frame; two split it
 * 2:1 side by side (a 3:1.5 stack reads as two letterboxes, not a gallery); three
 * become a hero plus a stacked pair, which is the shape people recognise as
 * "there are more inside".
 */
function tileSpan(index: number, tileCount: number) {
  if (tileCount === 1) return "col-span-3 row-span-2";
  if (tileCount === 2) {
    return index === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-2";
  }
  return index === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1";
}

export function GalleriesList({
  galleries,
  usage,
  totalGalleries,
  totalCount,
  totalPages,
  page,
  pageSize,
  filters,
}: Props) {
  const utils = api.useUtils();
  const router = useRouter();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Mutations ──────────────────────────────────────────────────────────────
  // Every handler dismisses the specific loading toast it opened — see
  // dismissLoadingToast. A bare toast.dismiss() clears every toast on screen.

  const afterWrite = () => {
    void utils.gallery.invalidate();
    router.refresh();
  };

  const deleteMutation = api.gallery.delete.useMutation({
    onMutate: loadingToast("Deleting gallery…"),
    onSuccess: (_data, _id, context) => {
      dismissLoadingToast(context);
      toast.success("Gallery deleted");
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _id, context) => {
      dismissLoadingToast(context);
      // On CONFLICT the server's message names the pages embedding the gallery.
      // Surfacing it verbatim is deliberate: it is the only place the owner
      // learns WHICH page blocked the delete when the badge was stale.
      toast.error(error.message ?? "Failed to delete gallery");
    },
  });

  const duplicateMutation = api.gallery.duplicate.useMutation({
    onMutate: loadingToast("Duplicating gallery…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Gallery duplicated");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to duplicate gallery");
    },
  });

  // ── Delete dialog context ──────────────────────────────────────────────────

  const deletingGallery = galleries.find((g) => g.id === deleteId);
  const deletingUsage = deleteId ? usage[deleteId] : undefined;
  const deletingName = deletingGallery?.name ?? "this gallery";
  const deletingImageCount = deletingGallery?._count.images ?? 0;
  /** "Homepage hero, About page and 3 more" — locations is capped at 5 server-side. */
  const deletingLocations = deletingUsage
    ? deletingUsage.locations.join(", ") +
      (deletingUsage.count > deletingUsage.locations.length
        ? ` and ${deletingUsage.count - deletingUsage.locations.length} more`
        : "")
    : "";

  // ── Render ─────────────────────────────────────────────────────────────────

  // Absolute empty state — no galleries at all, so there is nothing to filter.
  if (totalGalleries === 0) {
    return (
      <AdminEmpty
        icon={Images}
        title="No galleries yet"
        description="Create your first gallery to get started"
        action={
          <Button asChild>
            <Link href={`${BASE_PATH}/new`}>Create Gallery</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      {/* No onFiltersChange: that callback exists to drop a multi-select on a
          filter change, and this page has no selection to drop. */}
      <AdminFilters
        basePath={BASE_PATH}
        searchPlaceholder="Search galleries…"
        searchAriaLabel="Search galleries by name, URL or description"
        filters={filters}
        resultCount={totalCount}
        itemNoun={ITEM_NOUN}
      />

      {galleries.length === 0 ? (
        <AdminEmpty
          icon={Search}
          title="No galleries match your filters"
          // AdminEmpty renders its own "Try adjusting your search or filters."
          // line when `filtered` — don't say it twice.
          filtered
          action={
            <Button variant="outline" asChild>
              <Link href={BASE_PATH}>Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminCardGrid label="Galleries">
            {galleries.map((gallery) => {
              const count = gallery._count.images;
              // The router takes 4 thumbnails; the mosaic has room for 3, and the
              // remainder is expressed by the +N scrim instead.
              const tiles = gallery.images.slice(0, 3);
              const layout = isGalleryLayout(gallery.layout)
                ? gallery.layout
                : null;
              const layoutGlyph = layout ? LAYOUT_ICONS[layout] : "⊞";
              const layoutLabel = layout
                ? LAYOUT_LABELS[layout]
                : gallery.layout;
              const usedIn = usage[gallery.id];

              return (
                <li key={gallery.id}>
                  {/* Whole card is one link (CARD_STRETCHED_LINK below). Trade-off
                      accepted: the ::after overlay makes the card's text
                      unselectable by mouse. Tab order within a card is
                      name link → Embedded badge (when present) → actions menu. */}
                  <Card className={INTERACTIVE_CARD}>
                    {/* Cover mosaic. `bg-border` on the container rather than
                        `bg-muted`: the gap-px seams ARE the container showing
                        through, and the border token is the one that stays a
                        hairline against both photo edges and the card surface in
                        light and dark. Tiles carry `bg-muted` so a failed image
                        still reads as a neutral placeholder, not a border-coloured
                        block. */}
                    <div className="bg-border grid aspect-[3/2] grid-cols-3 grid-rows-2 gap-px overflow-hidden">
                      {tiles.length === 0 ? (
                        <div className="bg-muted col-span-3 row-span-2 flex flex-col items-center justify-center gap-2">
                          <Images
                            aria-hidden="true"
                            className="text-muted-foreground h-8 w-8"
                          />
                          <span className="text-muted-foreground text-xs">
                            No images yet
                          </span>
                        </div>
                      ) : (
                        tiles.map((image, index) => {
                          const isLast = index === tiles.length - 1;
                          const overflow = count - tiles.length;

                          return (
                            <div
                              key={image.id}
                              className={`bg-muted relative overflow-hidden ${tileSpan(
                                index,
                                tiles.length,
                              )}`}
                            >
                              {/* Decorative: the card's accessible name is the
                                  gallery-name link, and per-image alt text would
                                  read out as noise before it. */}
                              <img
                                src={image.url}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                              {isLast && overflow > 0 && (
                                // aria-hidden: the image-count badge below already
                                // conveys the number accessibly. bg-black/50 +
                                // white text is theme-independent by design.
                                <div
                                  aria-hidden="true"
                                  className="absolute inset-0 flex items-center justify-center bg-black/50"
                                >
                                  <span className="text-sm font-medium text-white tabular-nums">
                                    +{overflow}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* The anchor wraps ONLY the name — assistive tech gets
                              a link called "<name>", while ::after makes the whole
                              card clickable. */}
                          <Link
                            href={`${BASE_PATH}/${gallery.id}`}
                            className={`font-medium group-hover:underline ${CARD_STRETCHED_LINK}`}
                          >
                            <span className="block truncate">
                              {gallery.name}
                            </span>
                          </Link>

                          {gallery.description && (
                            <p className="text-muted-foreground mt-1 truncate text-sm">
                              {gallery.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">
                              <span aria-hidden="true">{layoutGlyph}</span>{" "}
                              {layoutLabel}
                            </Badge>
                            <Badge variant="secondary" className="tabular-nums">
                              {count} {count === 1 ? "image" : "images"}
                            </Badge>

                            {usedIn && (
                              // Warns BEFORE the delete dialog that this gallery
                              // is load-bearing on the storefront. CARD_RAISED so
                              // it sits above the stretched-link overlay and can
                              // actually receive hover/focus; tabIndex={0} makes
                              // the tooltip reachable by keyboard.
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    tabIndex={0}
                                    className={CARD_RAISED}
                                  >
                                    <Link2 aria-hidden="true" />
                                    Embedded
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-72">
                                  Used on: {usedIn.locations.join(", ")}
                                  {usedIn.count > usedIn.locations.length &&
                                    ` and ${
                                      usedIn.count - usedIn.locations.length
                                    } more`}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          <p className="text-muted-foreground mt-2 text-xs">
                            Updated{" "}
                            {formatDistanceToNow(new Date(gallery.updatedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {/* CARD_RAISED: a sibling of the stretched link, so it
                                needs to win pointer events over the overlay. */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className={CARD_RAISED}
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">
                                Actions for {gallery.name}
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Kept even though the card itself navigates: the
                                menu is where people look for "edit", and a
                                screen-reader user opening it should not find an
                                actions list missing the primary action. */}
                            <DropdownMenuItem asChild>
                              <Link href={`${BASE_PATH}/${gallery.id}`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
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
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(gallery.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </AdminCardGrid>

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

      {/* Delete confirmation. Two branches, because an embedded gallery cannot be
          deleted at all — offering a Delete button that can only ever produce a
          CONFLICT toast is worse than not offering one. The server guard remains
          the enforcement if this map is stale. */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          {deletingUsage ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {`Can’t delete “${deletingName}”`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {`This gallery is still embedded on your storefront, so deleting it would leave those pages broken. Used on: ${deletingLocations}. Remove it from ${
                    deletingUsage.count === 1 ? "that place" : "those places"
                  } first, then delete it here.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                {/* Name in the TITLE, consequence in the description — the shape
                    Inventory and Collections use. */}
                <AlertDialogTitle>
                  {`Delete “${deletingName}”?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deletingImageCount === 0
                    ? "This permanently deletes the gallery. This action cannot be undone."
                    : `This permanently deletes the gallery and its ${deletingImageCount} ${
                        deletingImageCount === 1 ? "image" : "images"
                      }, including the stored files. This action cannot be undone.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                {/* `variant`, NOT className. AlertDialogAction wraps a `Button …
                    asChild`, so a className lands on the inner Radix element while
                    Button still supplies `bg-primary` — and Slot concatenates the
                    two without tailwind-merge, so a `className="bg-destructive"`
                    here renders BLACK. */}
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
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
