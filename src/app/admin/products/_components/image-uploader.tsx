"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown, Images, Upload } from "lucide-react";
import { toast } from "sonner";

import type { FormProductImage } from "../_validators/schema";
import type { MediaItem } from "~/components/media/media-grid";
import type { MediaPickerPick } from "~/components/media/media-picker-dialog";
import { prepareImageForUpload } from "~/lib/image-prep";
import {
  isVideoMedia,
  MAX_PRODUCT_VIDEOS,
  PRODUCT_VIDEO_EXTS,
} from "~/lib/products/media";
import { cn } from "~/lib/utils";
import { MAX_PRODUCT_IMAGES } from "~/lib/validators/product";
import {
  captureVideoPoster,
  checkProductVideoFile,
  looksLikeVideoFile,
  withProductVideoMimeType,
} from "~/lib/video-prep";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";

import { SortableImage } from "./sortable-image";

export const FIRST_ITEM_PHOTO_MESSAGE =
  "The first item must be a photo — it's what shows on product cards and at checkout.";
const NO_PHOTO_MESSAGE = "Add a photo before videos.";

const ACCEPT = "image/*,video/mp4,video/webm,video/quicktime";

function isPhotoFile(file: File): boolean {
  // Some browsers (notably Android Chrome) leave `file.type` empty for
  // HEIC/HEIF, so fall back to the extension for those.
  return file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
}

/** Library videos the `productVideos` formats cover (MP4/WebM/MOV). */
function isUsableLibraryItem(item: MediaItem): boolean {
  if (item.kind !== "video") return true;
  const key = item.key.toLowerCase();
  return PRODUCT_VIDEO_EXTS.some((ext) => key.endsWith(ext));
}

function reindex(items: FormProductImage[]): FormProductImage[] {
  return items.map((item, idx) => ({ ...item, sortOrder: idx }));
}

/**
 * Moves the first photo to the front when a video would otherwise lead the
 * gallery. Returns the same array when nothing needed to move.
 */
function photoFirst(items: FormProductImage[]): FormProductImage[] {
  if (!isVideoMedia(items[0])) return items;
  const photoIndex = items.findIndex((item) => !isVideoMedia(item));
  if (photoIndex < 0) return items;
  return reindex(arrayMove(items, photoIndex, 0));
}

type Props = {
  images: FormProductImage[];
  onImagesChange: (images: FormProductImage[]) => void;
  /** Total gallery cap (photos + videos). */
  maxImages?: number;
  /**
   * Gallery problem found by the parent's save-time validation (shown under
   * the list). The uploader also shows its own "add a photo" notice.
   */
  error?: string | null;
  /**
   * Adds a "Choose from library" option beside "Upload from device". Only
   * pass `true` when the `media` feature flag is enabled — `media.list` is
   * gated server-side and throws FORBIDDEN when the flag is off.
   */
  mediaLibraryEnabled?: boolean;
};

/**
 * Imperative handle so a parent (e.g. product-form's Reset / "Save & create
 * another" flows) can discard any pending, not-yet-uploaded gallery images
 * without having to reach into this component's internals. `reset()` revokes
 * every tracked blob: URL and clears the underlying file input so the same
 * file can be re-selected afterward.
 */
export type ImageUploaderHandle = {
  reset: () => void;
};

export const ImageUploader = forwardRef<ImageUploaderHandle, Props>(
  function ImageUploader(
    {
      images,
      onImagesChange,
      maxImages = MAX_PRODUCT_IMAGES,
      mediaLibraryEnabled,
      error,
    },
    ref,
  ) {
    // A real, stable-per-mount DOM id (not a hardcoded literal) so multiple
    // uploaders could render on one page without colliding.
    const inputId = useId();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    // Latest `images` for code that runs after an await (image prep can take
    // seconds for HEIC) — the closure's `images` would be stale by then.
    const imagesRef = useRef(images);
    imagesRef.current = images;
    // Track all blob: URLs we've created so we can revoke them on unmount.
    const pendingObjectUrlsRef = useRef<Set<string>>(new Set());

    // On unmount, revoke any remaining pending blob: URLs.
    useEffect(() => {
      const tracked = pendingObjectUrlsRef.current;
      return () => {
        for (const url of tracked) {
          URL.revokeObjectURL(url);
        }
        tracked.clear();
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          for (const url of pendingObjectUrlsRef.current) {
            URL.revokeObjectURL(url);
          }
          pendingObjectUrlsRef.current.clear();
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      }),
      [],
    );

    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const [isPreparing, setIsPreparing] = useState(false);
    // What the busy button says: photo prep is quick, video checks read the
    // whole file and capture a poster frame.
    const [preparingLabel, setPreparingLabel] = useState("Preparing photos…");

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    const limitReachedMessage = `This product already has ${maxImages} photos and videos — remove one to add more`;
    const videoLimitMessage = `Products can have at most ${MAX_PRODUCT_VIDEOS} videos`;

    const trackObjectUrl = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      pendingObjectUrlsRef.current.add(url);
      return url;
    };

    const releaseObjectUrl = (url: string | null | undefined) => {
      if (!url?.startsWith("blob:")) return;
      URL.revokeObjectURL(url);
      pendingObjectUrlsRef.current.delete(url);
    };

    type PreparedItem =
      | { kind: "photo"; file: File }
      | {
          kind: "video";
          file: File;
          poster: File | null;
          durationSec: number;
        };

    const addFiles = async (files: File[]) => {
      // 1. Sort into photos and videos, keeping pick order.
      const candidates: { kind: "photo" | "video"; file: File }[] = [];
      for (const file of files) {
        if (isPhotoFile(file)) candidates.push({ kind: "photo", file });
        else if (looksLikeVideoFile(file))
          candidates.push({ kind: "video", file });
        else toast.error(`Skipped "${file.name}": not a photo or video`);
      }
      if (candidates.length === 0) return;

      // 2. Truncate to the free slots BEFORE prep so we don't HEIC-convert
      // or scan files we'd throw away.
      const current = imagesRef.current;
      const slots = maxImages - current.length;
      if (slots <= 0) {
        toast.error(limitReachedMessage);
        return;
      }
      let videoSlots =
        MAX_PRODUCT_VIDEOS - current.filter((img) => isVideoMedia(img)).length;
      const hasPhoto =
        current.some((img) => !isVideoMedia(img)) ||
        candidates.some((c) => c.kind === "photo");
      const kept: typeof candidates = [];
      let limitSkipped = 0;
      let videoSkipped = 0;
      for (const candidate of candidates) {
        if (candidate.kind === "video") {
          if (!hasPhoto) continue; // reported once below
          if (videoSlots <= 0) {
            videoSkipped++;
            continue;
          }
        }
        if (kept.length >= slots) {
          limitSkipped++;
          continue;
        }
        if (candidate.kind === "video") videoSlots--;
        kept.push(candidate);
      }
      if (!hasPhoto) {
        toast.error("Add a photo before adding videos.");
      }
      if (videoSkipped > 0) {
        toast.error(
          `${videoLimitMessage} — skipped ${videoSkipped} video${videoSkipped === 1 ? "" : "s"}`,
        );
      }
      if (kept.length === 0) {
        if (limitSkipped > 0) toast.error(limitReachedMessage);
        return;
      }

      // 3. Prep: photos are normalized (HEIC → web format, downscale); videos
      // are checked for format/size/codec and get a poster frame. Videos run
      // one at a time — each check reads the whole file into memory.
      const hasVideo = kept.some((c) => c.kind === "video");
      setPreparingLabel(hasVideo ? "Checking videos…" : "Preparing photos…");
      setIsPreparing(true);
      const prepared: PreparedItem[] = [];
      try {
        const photoResults = await Promise.all(
          kept.map((c) =>
            c.kind === "photo"
              ? prepareImageForUpload(c.file)
              : Promise.resolve(null),
          ),
        );
        for (const [i, candidate] of kept.entries()) {
          if (candidate.kind === "photo") {
            const file = photoResults[i]!;
            if (file.size > MAX_FILE_SIZE) {
              toast.error(`Skipped "${file.name}": must be less than 5MB`);
              continue;
            }
            prepared.push({ kind: "photo", file });
            continue;
          }
          const check = await checkProductVideoFile(candidate.file);
          if (!check.ok) {
            toast.error(`Skipped "${candidate.file.name}"`, {
              description: check.message,
            });
            continue;
          }
          const poster = await captureVideoPoster(candidate.file);
          prepared.push({
            kind: "video",
            file: withProductVideoMimeType(candidate.file),
            poster,
            durationSec: check.durationSec,
          });
        }
      } finally {
        setIsPreparing(false);
      }

      // 4. Re-check against the live gallery: something may have been added
      // (e.g. from the library) while we were preparing.
      const live = imagesRef.current;
      let remaining = Math.max(0, maxImages - live.length);
      let liveVideoSlots =
        MAX_PRODUCT_VIDEOS - live.filter((img) => isVideoMedia(img)).length;
      const toAdd: FormProductImage[] = [];
      for (const item of prepared) {
        if (remaining <= 0) break;
        if (item.kind === "video") {
          if (liveVideoSlots <= 0) continue;
          liveVideoSlots--;
          toAdd.push({
            url: trackObjectUrl(item.file),
            altText: null,
            sortOrder: 0,
            file: item.file,
            mediaType: "VIDEO",
            posterFile: item.poster ?? undefined,
            posterUrl: item.poster ? trackObjectUrl(item.poster) : null,
            durationSec: item.durationSec || undefined,
          });
        } else {
          toAdd.push({
            url: trackObjectUrl(item.file),
            altText: null,
            sortOrder: 0,
            file: item.file,
            mediaType: "IMAGE",
          });
        }
        remaining--;
      }
      limitSkipped += prepared.length - toAdd.length;
      if (toAdd.length > 0) {
        onImagesChange(photoFirst(reindex([...live, ...toAdd])));
      }

      // Rejected files (too big, unplayable) already got their own toast, so
      // they aren't counted in the limit summary.
      if (limitSkipped > 0) {
        const total = toAdd.length + limitSkipped;
        if (toAdd.length === 0) {
          toast.error(limitReachedMessage);
        } else {
          toast.warning(
            `Added ${toAdd.length} of ${total} — products can have at most ${maxImages} photos and videos (${limitSkipped} skipped)`,
          );
        }
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Copy out of the live FileList *before* clearing the input — resetting
      // `value` empties that list, and the async work below would see nothing.
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (files.length === 0) return;
      void addFiles(files);
    };

    // Whole-card drop target. `dragenter`/`dragleave` fire for every child the
    // pointer crosses, so a depth counter (not the raw events) drives the
    // highlight.
    const dragDepthRef = useRef(0);
    const [isDragOver, setIsDragOver] = useState(false);

    const isFileDrag = (e: React.DragEvent) =>
      Array.from(e.dataTransfer.types).includes("Files");

    const handleDragEnter = (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsDragOver(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      // Always cancel so the browser never navigates to a dropped file.
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };

    const handleDragLeave = (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragOver(false);
      if (isPreparing) {
        toast.info("Still preparing files — try again in a moment");
        return;
      }
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      void addFiles(files);
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = images.findIndex((img) => img.url === active.id);
      const newIndex = images.findIndex((img) => img.url === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(images, oldIndex, newIndex);
      // A video can never lead: cancel the move rather than quietly
      // rearranging something the owner didn't touch.
      if (
        isVideoMedia(reordered[0]) &&
        reordered.some((img) => !isVideoMedia(img))
      ) {
        toast.error(FIRST_ITEM_PHOTO_MESSAGE);
        return;
      }

      onImagesChange(reindex(reordered));
    };

    const removeImage = (index: number) => {
      const img = images[index];
      // Revoke blob: URLs for pending (not-yet-uploaded) files and posters.
      if (img?.file) releaseObjectUrl(img.url);
      if (img?.posterFile) releaseObjectUrl(img.posterUrl);
      const updated = reindex(images.filter((_, i) => i !== index));
      const fixed = photoFirst(updated);
      if (fixed !== updated) {
        toast.info(
          "Moved a photo to the front — the first item must be a photo.",
        );
      }
      onImagesChange(fixed);
    };

    const updateAltText = (index: number, altText: string) => {
      const updated = [...images];
      updated[index] = { ...updated[index]!, altText };
      onImagesChange(updated);
    };

    const canUploadMore = images.length < maxImages;
    const videoCount = images.filter((img) => isVideoMedia(img)).length;
    // Save is blocked by the gallery schema in these states; say so here
    // rather than only at save time.
    const orderProblem =
      videoCount > 0 && videoCount === images.length
        ? NO_PHOTO_MESSAGE
        : isVideoMedia(images[0])
          ? FIRST_ITEM_PHOTO_MESSAGE
          : null;
    const galleryError = orderProblem ?? error ?? null;
    const showLibraryPicker = Boolean(mediaLibraryEnabled);

    const triggerFileInput = () => {
      if (isPreparing) return;
      fileInputRef.current?.click();
    };

    const handleZoneKeyDown = (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      triggerFileInput();
    };

    // Library videos get a poster captured from their stored URL (needs CORS
    // on the bucket). On failure the poster stays empty and the storefront
    // shows the video's first frame instead.
    const attachLibraryPoster = async (videoUrl: string) => {
      const poster = await captureVideoPoster(videoUrl);
      if (!poster) return;
      const current = imagesRef.current;
      const index = current.findIndex(
        (img) => img.url === videoUrl && isVideoMedia(img) && !img.posterUrl,
      );
      if (index < 0) return; // removed (or given a poster) meanwhile
      const next = [...current];
      next[index] = {
        ...next[index]!,
        posterFile: poster,
        posterUrl: trackObjectUrl(poster),
      };
      onImagesChange(next);
    };

    // The picker already caps selection at the remaining slots; the checks here
    // are a backstop for a gallery that changed while the dialog was open.
    const handleLibrarySelectMany = (
      urls: string[],
      picks: MediaPickerPick[],
    ) => {
      const current = imagesRef.current;
      const kindByUrl = new Map(picks.map((p) => [p.url, p.kind]));
      const existing = new Set(current.map((img) => img.url));
      const fresh = [...new Set(urls)].filter((url) => !existing.has(url));
      if (fresh.length < urls.length) {
        toast.info("Skipped items that are already in the gallery");
      }
      const remaining = Math.max(0, maxImages - current.length);
      if (fresh.length > 0 && remaining === 0) {
        toast.error(limitReachedMessage);
        return;
      }

      const hasPhoto =
        current.some((img) => !isVideoMedia(img)) ||
        fresh.some((url) => kindByUrl.get(url) !== "video");
      let videoSlots =
        MAX_PRODUCT_VIDEOS - current.filter((img) => isVideoMedia(img)).length;
      const accepted: string[] = [];
      let videoSkipped = 0;
      for (const url of fresh) {
        if (kindByUrl.get(url) === "video") {
          if (!hasPhoto || videoSlots <= 0) {
            videoSkipped++;
            continue;
          }
          videoSlots--;
        }
        accepted.push(url);
      }
      if (videoSkipped > 0) {
        toast.error(
          hasPhoto
            ? `${videoLimitMessage} — skipped ${videoSkipped} video${videoSkipped === 1 ? "" : "s"}`
            : "Add a photo before adding videos.",
        );
      }

      const toAdd = accepted.slice(0, remaining);
      if (toAdd.length < accepted.length) {
        toast.warning(
          `Added ${toAdd.length} of ${accepted.length} — products can have at most ${maxImages} photos and videos (${accepted.length - toAdd.length} skipped)`,
        );
      }
      if (toAdd.length === 0) return;
      onImagesChange(
        photoFirst(
          reindex([
            ...current,
            ...toAdd.map((url): FormProductImage => {
              const isVideo = kindByUrl.get(url) === "video";
              return {
                url,
                altText: null,
                sortOrder: 0,
                mediaType: isVideo ? "VIDEO" : "IMAGE",
                ...(isVideo ? { posterUrl: null } : {}),
              };
            }),
          ]),
        ),
      );
      for (const url of toAdd) {
        if (kindByUrl.get(url) === "video") void attachLibraryPoster(url);
      }
    };

    const addButton = (label: string, ariaLabel?: string) =>
      showLibraryPicker ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isPreparing}
              aria-label={isPreparing ? undefined : ariaLabel}
            >
              {isPreparing ? (
                <>
                  <span
                    className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
                    aria-hidden="true"
                  />
                  {preparingLabel}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {label}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                queueMicrotask(triggerFileInput);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload from device
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                queueMicrotask(() => setPickerOpen(true));
              }}
            >
              <Images className="mr-2 h-4 w-4" />
              Choose from library
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={triggerFileInput}
          disabled={isPreparing}
          aria-label={isPreparing ? undefined : ariaLabel}
        >
          {isPreparing ? (
            <>
              <span
                className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
                aria-hidden="true"
              />
              {preparingLabel}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {label}
            </>
          )}
        </Button>
      );

    return (
      <>
        <Card
          className="group p-6"
          data-drag={isDragOver && canUploadMore && !isPreparing}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Photos &amp; videos</h3>
                <p className="text-muted-foreground text-sm">
                  {images.length} of {maxImages} items
                  {videoCount > 0 &&
                    ` · ${videoCount} of ${MAX_PRODUCT_VIDEOS} videos`}
                </p>
              </div>

              {canUploadMore && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id={inputId}
                    accept={ACCEPT}
                    multiple
                    disabled={isPreparing}
                    onChange={handleFileSelect}
                    className="hidden"
                    title="Upload photos or videos"
                  />
                  {addButton("Add", "Add photos or videos")}
                </div>
              )}
            </div>

            {images.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={images.map((img) => img.url)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {images.map((image, index) => (
                      <SortableImage
                        key={image.url}
                        image={image}
                        index={index}
                        onRemove={() => removeImage(index)}
                        onUpdateAlt={(alt) => updateAltText(index, alt)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div
                role="button"
                tabIndex={0}
                aria-label="Select photos or videos to upload"
                aria-disabled={isPreparing}
                className={cn(
                  "group-data-[drag=true]:border-primary group-data-[drag=true]:bg-primary/5 rounded-lg border-2 border-dashed p-12 text-center transition-colors",
                  isPreparing
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-muted/40 cursor-pointer",
                )}
                onClick={triggerFileInput}
                onKeyDown={handleZoneKeyDown}
              >
                <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <p className="text-foreground mb-2">No photos yet</p>
                <p className="text-muted-foreground mb-4 text-sm">
                  Drag and drop photos or videos here, or click to select
                  several (JPG, PNG, WebP, MP4, WebM, MOV)
                </p>
                {/* Keep the button/dropdown from also bubbling a click to the zone. */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {addButton("Select files")}
                </div>
              </div>
            )}

            {galleryError && (
              <p role="alert" className="text-destructive text-sm font-medium">
                {galleryError}
              </p>
            )}

            {canUploadMore && images.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                aria-label="Select more photos or videos to upload"
                aria-disabled={isPreparing}
                className={cn(
                  "group-data-[drag=true]:border-primary group-data-[drag=true]:bg-primary/5 border-border rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                  isPreparing
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-muted/40 cursor-pointer",
                )}
                onClick={triggerFileInput}
                onKeyDown={handleZoneKeyDown}
              >
                <p className="text-muted-foreground text-sm">
                  Drag and drop more photos or videos here, or click to browse
                </p>
              </div>
            )}

            <p className="text-muted-foreground text-xs">
              Drag to reorder. Up to {maxImages} items, including up to{" "}
              {MAX_PRODUCT_VIDEOS} videos (MP4, WebM or MOV, 50MB max). The
              first item must be a photo.
              {images.some((img) => img.file ?? img.posterFile) && (
                <span className="ml-1 text-amber-600">
                  Pending files upload when you save.
                </span>
              )}
            </p>
          </div>
        </Card>
        {/* Outside the Card on purpose: React events bubble through portals, so
          a file dropped on the picker's upload zone would otherwise also hit
          the Card's drop handler and be added twice. */}
        {showLibraryPicker && (
          <MediaPickerDialog
            kind="image"
            kinds={["image", "video"]}
            acceptItem={isUsableLibraryItem}
            maxSelectByKind={{
              video: Math.max(0, MAX_PRODUCT_VIDEOS - videoCount),
            }}
            multiple
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            maxSelect={Math.max(0, maxImages - images.length)}
            excludeUrls={images.map((img) => img.url)}
            onSelectMany={handleLibrarySelectMany}
          />
        )}
      </>
    );
  },
);
