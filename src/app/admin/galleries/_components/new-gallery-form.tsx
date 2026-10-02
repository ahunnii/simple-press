"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ChevronDown,
  Images,
  PlusCircle,
  Save,
  Upload,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { PendingImageGridItem } from "~/components/inputs/pending-image-grid";
import type { GalleryCreateData } from "~/lib/validators/gallery";
import { getImageDimensions } from "~/lib/uploads";
import { cn } from "~/lib/utils";
import {
  GALLERY_MAX_IMAGES,
  galleryCreateSchema,
} from "~/lib/validators/gallery";
import { api } from "~/trpc/react";
import { useDeferredImageUpload } from "~/hooks/use-deferred-image-upload";
import { useMediaLibraryEnabled } from "~/hooks/use-media-library-enabled";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { NumberFormField } from "~/components/inputs/number-form-field";
import { PendingImageGrid } from "~/components/inputs/pending-image-grid";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { GalleryRenderer } from "~/components/gallery-renderer";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";

// Mirrors galleryCreateSchema caps in src/lib/validators/gallery.ts
const NAME_MAX = 120;
const DESCRIPTION_MAX = 1000;

/**
 * Layout picker options. Kept in step with `gallery-editor.tsx` — the create
 * and edit forms describe the same five layouts, and a difference between them
 * reads to the owner as a behaviour difference.
 */
const LAYOUT_OPTIONS = [
  {
    value: "grid",
    glyph: "⊞",
    name: "Grid",
    description: "Equal-sized images in rows and columns",
  },
  {
    value: "masonry",
    glyph: "▦",
    name: "Masonry",
    description: "Pinterest-style cascading layout",
  },
  {
    value: "carousel",
    glyph: "⊏",
    name: "Carousel",
    description: "Slideshow with navigation",
  },
  {
    value: "collage",
    glyph: "▤",
    name: "Collage",
    description: "Mixed sizes arrangement",
  },
  {
    value: "justified",
    glyph: "▬",
    name: "Justified",
    description: "Flickr-style justified rows",
  },
] as const;

/**
 * Copy is shared with `gallery-editor.tsx`; verified against `GalleryRenderer`.
 * Kept deliberately terse: the settings sit in a half-page column split into
 * two ~250px tracks, so anything longer than roughly two lines wraps into a
 * ragged block.
 */
const HELP = {
  columns:
    "How many images sit side by side on desktop. Narrower screens use fewer.",
  gap: "Space between images. 0 makes them touch edge to edge. Recommended 8–24px.",
  aspectRatio:
    "Crops every image to the same shape. “Original” keeps natural proportions.",
  showCaptions: "Add captions per image in the Images tab, after you save.",
  captionStyle:
    "A bar over the image (always or on hover), or plain text below it.",
  captionStyleCarousel:
    "Carousel always shows captions below, so this only affects other layouts.",
  lightbox:
    "Click an image to open it full-screen. Arrow keys move, Esc closes.",
} as const;

/**
 * Stand-in images for the preview before anything is selected. Deliberately
 * varied proportions: with six identical squares, masonry and justified would
 * render as a plain grid and the preview would lie about what those layouts do.
 */
const SAMPLE_SIZES = [
  [800, 800],
  [800, 1120],
  [800, 600],
  [800, 960],
  [800, 700],
  [800, 1040],
] as const;

/** Inline SVG data URI — no network request, no asset to keep in sync. */
function samplePlaceholder(width: number, height: number): string {
  const r = Math.round(Math.min(width, height) * 0.09);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="#e4e4e7"/>` +
    `<g fill="#c7c7cf">` +
    `<circle cx="${Math.round(width * 0.3)}" cy="${Math.round(height * 0.28)}" r="${r}"/>` +
    `<path d="M0 ${height} L${Math.round(width * 0.4)} ${Math.round(height * 0.46)} L${Math.round(width * 0.72)} ${height} Z"/>` +
    `<path d="M${Math.round(width * 0.5)} ${height} L${Math.round(width * 0.78)} ${Math.round(height * 0.58)} L${width} ${height} Z"/>` +
    `</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE_IMAGES = SAMPLE_SIZES.map(([width, height], index) => ({
  id: `sample-${index}`,
  url: samplePlaceholder(width, height),
  altText: "",
  caption: `Sample caption ${index + 1}`,
}));

/** An image picked from the Media Library — already stored, never uploaded here. */
type LibraryImage = {
  /** Client-only id, so the same URL could never collide with a pending file. */
  id: string;
  url: string;
  width?: number;
  height?: number;
};

/** One tile in the unified image grid: a library pick or a staged file. */
type GridItem = PendingImageGridItem & { source: "library" | "file" };

const isImageFile = (file: File) =>
  // Some browsers (notably Android Chrome) leave `file.type` empty for
  // HEIC/HEIF, so fall back to the extension for those.
  file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);

/** Last path segment of a stored URL, for the tile's accessible name. */
const urlFilename = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  } catch {
    return url.split("/").pop() ?? "";
  }
};

const NEW_GALLERY_DEFAULTS: GalleryCreateData = {
  name: "",
  description: "",
  layout: "grid",
  columns: 3,
  gap: 16,
  aspectRatio: "1:1",
  captionStyle: "overlay",
  showCaptions: true,
  enableLightbox: true,
};

export function NewGalleryForm() {
  const router = useRouter();
  const utils = api.useUtils();

  // Ref tracks whether the "Save & create another" button was clicked
  const createAnotherRef = useRef<boolean>(false);

  // Track whether we're waiting for createMutation to settle (set in onSubmit,
  // cleared in mutation callbacks)
  const [isSaving, setIsSaving] = useState(false);

  const upload = useDeferredImageUpload({ route: "galleryImages" });
  const mediaLibraryEnabled = useMediaLibraryEnabled();

  // Library picks live beside the hook's pending files. `order` holds the
  // owner's arrangement of BOTH as ids; anything not in it yet (a file still
  // being prepared when the order was last written) is appended at the end.
  // The hook's own `pendingFiles` order is kept in step on every reorder, so
  // `uploadAll()` (which returns results in that order) can be zipped back
  // into the displayed order on submit.
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Resolving natural dimensions for library picks. Counts as processing so a
  // submit can't race ahead of picks that haven't landed in state yet.
  const [isResolvingLibrary, setIsResolvingLibrary] = useState(false);
  const nextLibraryIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const items = useMemo<GridItem[]>(() => {
    const byId = new Map<string, GridItem>();
    for (const img of libraryImages) {
      byId.set(img.id, {
        id: img.id,
        previewUrl: img.url,
        label: urlFilename(img.url),
        badge: "Library",
        source: "library",
      });
    }
    for (const pf of upload.pendingFiles) {
      byId.set(pf.id, { ...pf, source: "file" });
    }
    const ordered: GridItem[] = [];
    for (const id of order) {
      const item = byId.get(id);
      if (item) {
        ordered.push(item);
        byId.delete(id);
      }
    }
    return [...ordered, ...byId.values()];
  }, [libraryImages, upload.pendingFiles, order]);

  // Latest values for code that runs after an await.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const form = useForm<GalleryCreateData>({
    resolver: zodResolver(galleryCreateSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: NEW_GALLERY_DEFAULTS,
  });

  const createMutation = api.gallery.create.useMutation({
    onSuccess: ({ data, message }) => {
      toast.dismiss();
      setIsSaving(false);
      void utils.gallery.invalidate();

      if (createAnotherRef.current) {
        createAnotherRef.current = false;
        upload.clear();
        setLibraryImages([]);
        setOrder([]);
        form.reset(NEW_GALLERY_DEFAULTS);
        toast.success("Gallery created — add another");
        router.push("/admin/galleries/new");
      } else {
        toast.success(message);
        router.push(`/admin/galleries/${data.id}`);
      }
    },
    onError: (error) => {
      createAnotherRef.current = false;
      setIsSaving(false);
      toast.dismiss();
      toast.error(error.message || "Failed to create gallery");
      // Orphaned-upload cleanup lives on the per-call `onError` in onSubmit:
      // `variables.images` also carries Media Library URLs, which belong to
      // other content and must never be discarded.
    },
  });

  const onSubmit = useCallback(
    async (formData: GalleryCreateData) => {
      const hasPendingFiles = upload.pendingFiles.length > 0;
      setIsSaving(true);
      toast.loading(
        hasPendingFiles ? "Uploading images…" : "Creating gallery…",
      );

      try {
        // uploadAll() handles its own partial-upload cleanup on failure, and
        // returns results in the hook's pendingFiles order — which handleReorder
        // keeps equal to the files' relative order in the grid.
        const uploadedInfos = hasPendingFiles ? await upload.uploadAll() : [];
        if (hasPendingFiles) {
          toast.dismiss();
          toast.loading("Creating gallery…");
        }

        // Zip uploads back into the displayed order: each "file" tile takes
        // the next upload result, each "library" tile its stored URL.
        const libraryById = new Map(libraryImages.map((img) => [img.id, img]));
        const uploadQueue = [...uploadedInfos];
        const ordered: { url: string; width?: number; height?: number }[] = [];
        for (const item of items) {
          if (item.source === "library") {
            const lib = libraryById.get(item.id);
            if (lib) ordered.push(lib);
          } else {
            const next = uploadQueue.shift();
            if (next) ordered.push(next);
          }
        }
        // Backstop: never drop an upload the grid somehow didn't account for.
        ordered.push(...uploadQueue);

        const images = ordered.map(({ url, width, height }) => ({
          url,
          altText: "" as string,
          caption: "" as string,
          ...(width !== undefined && height !== undefined
            ? { width, height }
            : {}),
        }));

        // ONLY this submit's uploads may be discarded if the create fails —
        // library URLs are shared with other content.
        const uploadedUrls = uploadedInfos.map((info) => info.url);
        createMutation.mutate(
          images.length > 0 ? { ...formData, images } : { ...formData },
          {
            onError: () => {
              if (uploadedUrls.length > 0) upload.discard(uploadedUrls);
            },
          },
        );
      } catch (err) {
        // uploadAll() threw — it already discarded any partial uploads
        toast.dismiss();
        const message =
          err instanceof Error
            ? err.message
            : "Upload failed. Please try again.";
        toast.error(message);
        createAnotherRef.current = false;
        setIsSaving(false);
      }
    },
    [upload, createMutation, libraryImages, items],
  );

  const limitReachedMessage = `Galleries can have at most ${GALLERY_MAX_IMAGES} images — remove one to add more`;

  const addFiles = (files: File[]) => {
    const candidates = files.filter(isImageFile);
    // Non-images still go to the hook, which reports them in its own toast.
    const nonImages = files.filter((file) => !isImageFile(file));
    // Truncate before the hook's HEIC prep so nothing is converted only to be
    // thrown away. (Files still being prepared from an earlier add aren't in
    // `items` yet; the server's GALLERY_MAX_IMAGES cap backstops that race.)
    const slots = Math.max(0, GALLERY_MAX_IMAGES - itemsRef.current.length);
    const kept = candidates.slice(0, slots);
    const skipped = candidates.length - kept.length;
    if (skipped > 0) {
      if (kept.length === 0) {
        toast.error(limitReachedMessage);
      } else {
        toast.warning(
          `Adding ${kept.length} of ${candidates.length} images — galleries can have at most ${GALLERY_MAX_IMAGES} (${skipped} skipped)`,
        );
      }
    }
    if (kept.length + nonImages.length > 0) {
      upload.addFiles([...kept, ...nonImages]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Copy out of the live FileList *before* clearing the input — resetting
    // `value` empties that list (Chrome), and the hook's async prep would see
    // nothing.
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    addFiles(files);
  };

  const handleReorder = (next: GridItem[]) => {
    setOrder(next.map((item) => item.id));
    // Keep the hook's list in the same relative order — see onSubmit.
    const pendingById = new Map(upload.pendingFiles.map((pf) => [pf.id, pf]));
    upload.reorder(
      next.flatMap((item) => {
        const pf = item.source === "file" ? pendingById.get(item.id) : null;
        return pf ? [pf] : [];
      }),
    );
  };

  const handleRemove = (id: string) => {
    if (libraryImages.some((img) => img.id === id)) {
      setLibraryImages((prev) => prev.filter((img) => img.id !== id));
    } else {
      upload.removeFile(id);
    }
  };

  // The picker already caps selection at the remaining slots and disables
  // images already picked; the checks here are a backstop.
  const handleLibrarySelectMany = (urls: string[]) => {
    const existing = new Set(
      itemsRef.current
        .filter((item) => item.source === "library")
        .map((item) => item.previewUrl),
    );
    const fresh = [...new Set(urls)].filter((url) => !existing.has(url));
    if (fresh.length < urls.length) {
      toast.info("Skipped images that are already in the gallery");
    }
    const remaining = Math.max(0, GALLERY_MAX_IMAGES - itemsRef.current.length);
    if (fresh.length > 0 && remaining === 0) {
      toast.error(limitReachedMessage);
      return;
    }
    const toAdd = fresh.slice(0, remaining);
    if (toAdd.length < fresh.length) {
      toast.warning(
        `Adding ${toAdd.length} of ${fresh.length} images — galleries can have at most ${GALLERY_MAX_IMAGES} (${fresh.length - toAdd.length} skipped)`,
      );
    }
    if (toAdd.length === 0) return;

    setIsResolvingLibrary(true);
    void (async () => {
      try {
        const entries: LibraryImage[] = await Promise.all(
          toAdd.map(async (url) => ({
            id: `library-${(nextLibraryIdRef.current++).toString()}`,
            url,
            ...(await getImageDimensions(url)),
          })),
        );
        // Pin everything currently shown in place, then append the picks in
        // pick order.
        setOrder([
          ...itemsRef.current.map((item) => item.id),
          ...entries.map((entry) => entry.id),
        ]);
        setLibraryImages((prev) => [...prev, ...entries]);
      } finally {
        setIsResolvingLibrary(false);
      }
    })();
  };

  const layout = form.watch("layout");
  const columns = form.watch("columns");
  const gap = form.watch("gap");
  const aspectRatio = form.watch("aspectRatio");
  const captionStyle = form.watch("captionStyle");
  const showCaptions = form.watch("showCaptions");
  const enableLightbox = form.watch("enableLightbox");

  // Columns only: collage and justified derive their own column count, and
  // carousel shows one image at a time.
  const showColumnsField = layout === "grid" || layout === "masonry";
  // Every layout except carousel spaces its images with `gap`
  // (gallery-renderer.tsx: grid L264, masonry L339/L347, collage L481/L489,
  // justified L560/L566). Carousel shows one image at a time and never reads
  // it, which is the only reason to hide the control.
  const showGapField = layout !== "carousel";
  // Only the grid layout reads aspectRatio.
  const showAspectRatioField = layout === "grid";

  /**
   * Columns / Gap / Aspect Ratio flow after the full-width Layout Style picker
   * in the card's 2-track grid, and which of them exist depends on the layout
   * (grid: all three, masonry: columns + gap, collage/justified: gap only,
   * carousel: none). An odd number of them leaves the last one with no partner
   * — a half-width control sitting beside an empty half. Give that one both
   * tracks instead. Derived from the visibility flags rather than hardcoded per
   * layout, so it stays correct if the rules above change.
   */
  const subFields = [
    { name: "columns", visible: showColumnsField },
    { name: "gap", visible: showGapField },
    { name: "aspectRatio", visible: showAspectRatioField },
  ].filter((subField) => subField.visible);

  const unpairedSubField =
    subFields.length % 2 === 1
      ? subFields[subFields.length - 1]?.name
      : undefined;

  /** Both tracks for the unpaired trailing control, one track for the rest. */
  const subFieldSpan = (name: string) =>
    name === unpairedSubField ? "sm:col-span-2" : "sm:col-span-1";

  /**
   * Nothing is saved yet, so the preview runs on whatever is closest to real:
   * the images in the grid, in grid order (library picks by their stored URL,
   * staged files by their local object URL), else inline sample placeholders. Adapted here rather than in `GalleryRenderer` — the
   * renderer's contract is a saved gallery.
   */
  const previewImages = useMemo(
    () =>
      items.length > 0
        ? items.map((item, index) => ({
            id: item.id,
            url: item.previewUrl,
            altText: "",
            // Per-image captions are only editable after the gallery exists, so
            // there is nothing real to show here — see the note under the card.
            caption: `Sample caption ${index + 1}`,
          }))
        : SAMPLE_IMAGES,
    [items],
  );

  /**
   * The shape `GalleryRenderer` takes, assembled from live form values so the
   * preview moves as the settings do. `enableLightbox` is forced OFF here — see
   * the `inert` note at the preview card.
   */
  const previewGallery = {
    layout,
    columns,
    gap,
    aspectRatio,
    captionStyle,
    showCaptions,
    enableLightbox: false,
    images: previewImages,
  };

  const isDirty = form.formState.isDirty || items.length > 0;
  const isProcessing =
    isSaving ||
    upload.isUploading ||
    upload.isPreparing ||
    isResolvingLibrary ||
    createMutation.isPending;

  const canAddMore = items.length < GALLERY_MAX_IMAGES;

  const triggerFileInput = () => {
    if (isProcessing) return;
    fileInputRef.current?.click();
  };

  const handleZoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    triggerFileInput();
  };

  // Whole-card drop target. `dragenter`/`dragleave` fire for every child the
  // pointer crosses, so a depth counter (not the raw events) drives the
  // highlight. Only OS file drags count — the grid's dnd-kit reorder uses
  // pointer events, not HTML5 drag.
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
    if (isProcessing) {
      toast.info(
        upload.isPreparing
          ? "Still preparing photos — try again in a moment"
          : "Still working — try again in a moment",
      );
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    addFiles(files);
  };

  const spinner = (
    <span
      className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2"
      aria-hidden="true"
    />
  );

  const addButtonContent = (label: string, withChevron: boolean) =>
    upload.isPreparing ? (
      <>
        {spinner}
        Preparing photos…
      </>
    ) : (
      <>
        <Upload className="mr-2 h-4 w-4" />
        {label}
        {withChevron && <ChevronDown className="ml-2 h-4 w-4 opacity-60" />}
      </>
    );

  const addButton = (label: string) =>
    mediaLibraryEnabled ? (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" disabled={isProcessing}>
            {addButtonContent(label, true)}
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
        disabled={isProcessing}
      >
        {addButtonContent(label, false)}
      </Button>
    );

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="bg-muted/40 min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/galleries">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">New Gallery</h1>
              <span
                className={`admin-status-badge ${
                  isDirty ? "isDirty" : "isPublished"
                }`}
              >
                {isDirty ? "Unsaved Changes" : "Saved"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/galleries">Cancel</Link>
            </Button>

            {/* Save & create another */}
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => {
                createAnotherRef.current = true;
              }}
              className="hidden sm:inline-flex"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Save &amp; create another
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isProcessing}
              onClick={() => {
                createAnotherRef.current = false;
              }}
            >
              {isProcessing ? (
                <>
                  <span className="saving-indicator" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Save changes</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="admin-container space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Give your gallery a name and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Gallery Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="My Gallery"
                        maxLength={NAME_MAX}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormMessage />
                      <span className="text-muted-foreground ml-auto text-xs">
                        {field.value?.length ?? 0}/{NAME_MAX}
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe what this gallery is about..."
                        rows={3}
                        maxLength={DESCRIPTION_MAX}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormMessage />
                      <span className="text-muted-foreground ml-auto text-xs">
                        {field.value?.length ?? 0}/{DESCRIPTION_MAX}
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Images — deferred upload. The whole card is the file drop
              target; see handleDrop. */}
          <Card
            className="group"
            data-drag={isDragOver && canAddMore && !isProcessing}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>
                {mediaLibraryEnabled
                  ? "Add images from your device or your library. New uploads are sent when you click Save."
                  : "Select images to add on save. Nothing is uploaded until you click Save."}
              </CardDescription>
              {canAddMore && (
                <CardAction>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={isProcessing}
                    className="hidden"
                    title="Upload images"
                    onChange={handleFileInput}
                  />
                  {addButton("Add images")}
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">
                    {items.length} {items.length === 1 ? "image" : "images"}{" "}
                    selected — drag to reorder. The first image leads the
                    gallery.
                  </p>
                  <PendingImageGrid
                    items={items}
                    onReorder={handleReorder}
                    onRemove={handleRemove}
                  />
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Select images to upload"
                  aria-disabled={isProcessing}
                  className={cn(
                    "group-data-[drag=true]:border-primary group-data-[drag=true]:bg-primary/5 rounded-lg border-2 border-dashed p-12 text-center transition-colors",
                    isProcessing
                      ? "cursor-not-allowed opacity-60"
                      : "hover:bg-muted/40 cursor-pointer",
                  )}
                  onClick={triggerFileInput}
                  onKeyDown={handleZoneKeyDown}
                >
                  <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <p className="text-foreground mb-2">No images yet</p>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Drag and drop images here, or click to select multiple
                    (JPEG, PNG, WebP, GIF, AVIF — max 5 MB each)
                  </p>
                  {/* Keep the button/dropdown from also bubbling a click to the zone. */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {addButton("Select images")}
                  </div>
                </div>
              )}

              {canAddMore && items.length > 0 && (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Select more images to upload"
                  aria-disabled={isProcessing}
                  className={cn(
                    "group-data-[drag=true]:border-primary group-data-[drag=true]:bg-primary/5 border-border rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                    isProcessing
                      ? "cursor-not-allowed opacity-60"
                      : "hover:bg-muted/40 cursor-pointer",
                  )}
                  onClick={triggerFileInput}
                  onKeyDown={handleZoneKeyDown}
                >
                  <p className="text-muted-foreground text-sm">
                    Drag and drop more images here, or click to browse
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Outside the Card on purpose: React events bubble through portals,
              so a file dropped on the picker's upload zone would otherwise also
              hit the Card's drop handler and be added twice. */}
          {mediaLibraryEnabled && (
            <MediaPickerDialog
              kind="image"
              multiple
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              maxSelect={Math.max(0, GALLERY_MAX_IMAGES - items.length)}
              excludeUrls={libraryImages.map((img) => img.url)}
              onSelectMany={handleLibrarySelectMany}
            />
          )}

          {/* Settings on the left, the real gallery component on the right. */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Layout</CardTitle>
                  <CardDescription>
                    How the images are arranged wherever this gallery is
                    embedded
                  </CardDescription>
                </CardHeader>
                {/* A grid, not a stack: a 4-option Columns select and a 0–64
                    Gap box have no business filling the whole card.
                    `items-start` because FormItem is itself a grid — without it
                    a short-description cell stretches to its neighbour's height
                    and its label and control drift apart. */}
                <CardContent className="grid items-start gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="layout"
                    render={({ field }) => {
                      const selected = LAYOUT_OPTIONS.find(
                        (option) => option.value === field.value,
                      );
                      return (
                        // Hand-rolled rather than SelectFormField: Radix portals
                        // the SELECTED item's body into the closed trigger, so
                        // the rich glyph + name + description rows below would
                        // render inside it and inflate it into a two-line block
                        // taller than every other control. Passing explicit
                        // children to `SelectValue` suppresses that portal,
                        // keeping the descriptions in the open list where they
                        // belong.
                        <FormItem className="col-span-full">
                          <FormLabel>Layout Style</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a layout">
                                  {selected ? (
                                    <span className="flex items-center gap-2">
                                      <span aria-hidden="true">
                                        {selected.glyph}
                                      </span>
                                      <span>{selected.name}</span>
                                    </span>
                                  ) : null}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LAYOUT_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  // Radix derives typeahead from the item's
                                  // textContent, so without this the rich body
                                  // makes typing "gr" match against
                                  // "GridEqual-sized images in rows and
                                  // columns" instead of "Grid".
                                  textValue={option.name}
                                >
                                  <span className="flex items-center gap-2">
                                    <span aria-hidden="true">
                                      {option.glyph}
                                    </span>
                                    <span className="grid gap-0.5">
                                      <span className="font-medium">
                                        {option.name}
                                      </span>
                                      <span className="text-muted-foreground text-xs">
                                        {option.description}
                                      </span>
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {showColumnsField && (
                    <FormField
                      control={form.control}
                      name="columns"
                      render={({ field }) => (
                        // Hand-rolled rather than SelectFormField: this value is
                        // a NUMBER, and the shared wrapper always hands
                        // `field.onChange` the raw string.
                        <FormItem className={subFieldSpan("columns")}>
                          <FormLabel>Columns</FormLabel>
                          <Select
                            value={field.value.toString()}
                            onValueChange={(v) =>
                              field.onChange(parseInt(v, 10))
                            }
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="2">2 columns</SelectItem>
                              <SelectItem value="3">3 columns</SelectItem>
                              <SelectItem value="4">4 columns</SelectItem>
                              <SelectItem value="5">5 columns</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>{HELP.columns}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {showGapField && (
                    <NumberFormField
                      form={form}
                      name="gap"
                      label="Gap between images (px)"
                      description={HELP.gap}
                      className={subFieldSpan("gap")}
                      min={0}
                      max={64}
                      // `?? 16` and NOT `|| 16`: the schema default is 16, but 0
                      // is a legitimate gap ("touch edge to edge"), and a falsy
                      // check would bounce it back to 16.
                      onChange={(value) =>
                        form.setValue("gap", value ?? 16, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  )}

                  {showAspectRatioField && (
                    <SelectFormField
                      form={form}
                      name="aspectRatio"
                      label="Aspect Ratio"
                      description={HELP.aspectRatio}
                      className={subFieldSpan("aspectRatio")}
                      values={[
                        { value: "1:1", label: "1:1 — Square" },
                        { value: "4:3", label: "4:3 — Landscape" },
                        { value: "16:9", label: "16:9 — Widescreen" },
                        { value: "3:4", label: "3:4 — Portrait" },
                        { value: "original", label: "Original — Natural size" },
                      ]}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Display Options</CardTitle>
                  <CardDescription>
                    Captions and full-screen viewing
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid items-start gap-4 sm:grid-cols-2">
                  <SwitchFormField
                    form={form}
                    name="showCaptions"
                    label="Show captions"
                    description={HELP.showCaptions}
                  />

                  {showCaptions && (
                    <SelectFormField
                      form={form}
                      name="captionStyle"
                      label="Caption Style"
                      description={
                        layout === "carousel"
                          ? HELP.captionStyleCarousel
                          : HELP.captionStyle
                      }
                      // Full width (SelectFormField's own default is
                      // `col-span-full`) and indented under the switch that
                      // reveals it: a naked half-width select wedged between two
                      // full-width bordered switch rows reads as a broken
                      // layout, and the left rule shows the dependency on
                      // "Show captions".
                      className="ml-2 border-l pl-4"
                      values={[
                        { value: "overlay", label: "Always visible" },
                        { value: "hover", label: "Show on hover" },
                        { value: "below", label: "Below image" },
                      ]}
                    />
                  )}

                  <SwitchFormField
                    form={form}
                    name="enableLightbox"
                    label="Enable lightbox"
                    description={HELP.lightbox}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Preview column. The card is sticky so the settings can be
                scrolled against a preview that stays in view; top-20 clears the
                sticky admin-form-toolbar above it. */}
            <div>
              <Card className="lg:sticky lg:top-20">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    The same component your storefront renders, drawn with the
                    settings above
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* `inert`, and `enableLightbox` forced off in
                      previewGallery: this is a presentation surface, not a
                      working gallery. It matters most HERE — the renderer's
                      carousel arrows and dots carry no `type`, so inside this
                      <form> a click on one would submit and create the gallery.
                      inert also blocks focus and keeps this duplicate copy of
                      the images out of the accessibility tree. */}
                  <div
                    inert
                    className="bg-background overflow-hidden rounded-lg border p-3"
                  >
                    <GalleryRenderer gallery={previewGallery} />
                  </div>

                  <p className="text-muted-foreground text-xs">
                    {items.length > 0
                      ? upload.pendingFiles.length > 0
                        ? "Your selected images. New uploads are sent when you save."
                        : "Your selected images."
                      : "Sample images — select your own above and they will appear here."}
                  </p>
                  {showCaptions && (
                    <p className="text-muted-foreground text-xs">
                      Captions shown are sample text. Real captions are added
                      per image after you save.
                    </p>
                  )}
                  {enableLightbox && (
                    <p className="text-muted-foreground text-xs">
                      Lightbox is on: visitors can click an image to open it
                      full-screen. It is disabled in this preview so it cannot
                      cover the form.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
