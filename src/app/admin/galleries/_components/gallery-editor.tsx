"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { Gallery, GalleryImage } from "generated/prisma";
import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFiles } from "@better-upload/client";
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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Copy,
  MoreHorizontal,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { GalleryUpdateData } from "~/lib/validators/gallery";
import { getImageDimensions, getStoredPath } from "~/lib/uploads";
import { cn } from "~/lib/utils";
import { galleryUpdateSchema } from "~/lib/validators/gallery";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { UploadDropzone } from "~/components/ui/upload-dropzone";
import { NumberFormField } from "~/components/inputs/number-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { GalleryRenderer } from "~/components/gallery-renderer";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import { ImageEditModal } from "./image-edit-modal";
import { SortableImage } from "./sortable-image";

// Mirrors galleryUpdateSchema caps in src/lib/validators/gallery.ts
const NAME_MAX = 120;
const DESCRIPTION_MAX = 1000;

/**
 * Layout picker options. Kept in step with `new-gallery-form.tsx` — the create
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
 * Copy is shared with `new-gallery-form.tsx`; verified against
 * `GalleryRenderer`. Kept deliberately terse: the settings sit in a half-page
 * column split into two ~250px tracks, so anything longer than roughly two
 * lines wraps into a ragged block.
 */
const HELP = {
  columns:
    "How many images sit side by side on desktop. Narrower screens use fewer.",
  gap: "Space between images. 0 makes them touch edge to edge. Recommended 8–24px.",
  aspectRatio:
    "Crops every image to the same shape. “Original” keeps natural proportions.",
  showCaptions: "Add captions per image in the Images tab.",
  captionStyle:
    "A bar over the image (always or on hover), or plain text below it.",
  captionStyleCarousel:
    "Carousel always shows captions below, so this only affects other layouts.",
  lightbox:
    "Click an image to open it full-screen. Arrow keys move, Esc closes.",
} as const;

/**
 * Stand-in images for the preview when the gallery has none yet. Deliberately
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

type GalleryEditorProps = {
  gallery: Gallery & { images: GalleryImage[] };
  businessId: string;
};

export function GalleryEditor({ gallery }: GalleryEditorProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const dndId = useId();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<
    string | null
  >(null);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [images, setImages] = useState(gallery.images);

  const form = useForm<GalleryUpdateData>({
    resolver: zodResolver(galleryUpdateSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      id: gallery.id,
      name: gallery.name,
      description: gallery.description ?? "",
      layout: gallery.layout as GalleryUpdateData["layout"],
      columns: gallery.columns,
      gap: gallery.gap,
      aspectRatio: (gallery.aspectRatio ??
        "1:1") as GalleryUpdateData["aspectRatio"],
      captionStyle: (gallery.captionStyle ??
        "overlay") as GalleryUpdateData["captionStyle"],
      showCaptions: gallery.showCaptions,
      enableLightbox: gallery.enableLightbox,
    },
  });

  const isDirty = form.formState.isDirty;
  useDirtyForm(isDirty);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const uploadFiles = useUploadFiles({
    api: "/api/upload",
    route: "galleryImages",

    onBeforeUpload: () => {
      toast.loading("Uploading images...");
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error?.message ?? "Failed to upload images");
    },
    onUploadComplete: ({ files }) => {
      toast.dismiss();
      toast.success("Images uploaded");

      // Resolve natural dimensions for each uploaded file client-side.
      // Best-effort: if any image fails to load, we just omit width/height.
      const imageDataPromises = files.map(async (file) => {
        const url = getStoredPath(file);
        const dims = await getImageDimensions(url);
        return { url, ...dims };
      });

      void Promise.all(imageDataPromises).then((resolved) => {
        addImagesMutation.mutate({
          galleryId: gallery.id,
          images: resolved.map(({ url, width, height }) => ({
            url,
            altText: "",
            caption: "",
            ...(width !== undefined && height !== undefined
              ? { width, height }
              : {}),
          })),
        });
      });
    },
  });

  const updateMutation = api.gallery.update.useMutation({
    onSuccess: ({ data }) => {
      toast.dismiss();
      toast.success("Gallery updated");
      void utils.gallery.invalidate();
      form.reset({
        id: data.id,
        name: data.name,
        description: data.description ?? "",
        layout: data.layout as GalleryUpdateData["layout"],
        columns: data.columns,
        gap: data.gap,
        aspectRatio: (data.aspectRatio ??
          "1:1") as GalleryUpdateData["aspectRatio"],
        captionStyle: (data.captionStyle ??
          "overlay") as GalleryUpdateData["captionStyle"],
        showCaptions: data.showCaptions,
        enableLightbox: data.enableLightbox,
      });
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update");
    },
    onMutate: () => {
      toast.loading("Updating gallery...");
    },
  });

  const reorderMutation = api.gallery.reorderImages.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Image order saved");
      void utils.gallery.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to reorder images");
    },
    onMutate: () => {
      toast.loading("Reordering images...");
    },
  });

  // Cleans up S3 objects that uploaded successfully but were never persisted.
  const discardMutation = api.upload.discardUploads.useMutation();

  const addImagesMutation = api.gallery.addImages.useMutation({
    onSuccess: (result) => {
      toast.dismiss();
      toast.success("Images added");
      setImages(result.images);
      void utils.gallery.invalidate();
      router.refresh();
    },
    onError: (error, variables) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to add images");
      // The images uploaded to S3 but the DB write failed — discard the
      // orphaned objects so they don't accumulate.
      const urls = variables.images.map((img) => img.url);
      if (urls.length > 0) {
        discardMutation.mutate({ urls });
      }
    },
    onMutate: () => {
      toast.loading("Adding images...");
    },
  });

  const deleteImageMutation = api.gallery.deleteImage.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Image deleted");
      void utils.gallery.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to delete image");
    },
    onMutate: () => {
      toast.loading("Deleting image...");
    },
  });

  const deleteGalleryMutation = api.gallery.delete.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Gallery deleted");
      void utils.gallery.invalidate();
      router.push("/admin/galleries");
    },
    onError: (error) => {
      toast.dismiss();
      // On CONFLICT the server names the pages embedding this gallery. The
      // dialog below normally refuses before we get here, but the usage map can
      // be stale (or still loading), so keep the server's message verbatim.
      toast.error(error.message ?? "Failed to delete gallery");
    },
    onMutate: () => {
      toast.loading("Deleting gallery...");
    },
  });

  // Same usage map the list page renders its "Embedded" badge and two-branch
  // delete dialog from, and the same one `gallery.delete`'s guard is built from
  // — so the dialog and the server can't disagree about what is deletable. The
  // editor page doesn't prefetch it, so it's queried here; an ABSENT key means
  // "not embedded". Deferred until the dialog opens — it is a whole-business
  // scan of pages, posts and template fields, and nothing else on this screen
  // needs it.
  const usageQuery = api.gallery.usage.useQuery(undefined, {
    enabled: showDeleteDialog,
  });
  const galleryUsage = usageQuery.data?.[gallery.id];
  /** "Homepage hero, About page and 3 more" — locations is capped at 5 server-side. */
  const usageLocations = galleryUsage
    ? galleryUsage.locations.join(", ") +
      (galleryUsage.count > galleryUsage.locations.length
        ? ` and ${galleryUsage.count - galleryUsage.locations.length} more`
        : "")
    : "";

  const duplicateMutation = api.gallery.duplicate.useMutation({
    onMutate: loadingToast("Duplicating gallery…"),
    // A copy is made in order to be edited (same rationale as Products), so
    // land on the new gallery rather than leaving the owner on the original.
    onSuccess: ({ data }, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Gallery duplicated");
      void utils.gallery.invalidate();
      router.push(`/admin/galleries/${data.id}`);
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to duplicate gallery");
    },
  });

  const onSubmit = (data: GalleryUpdateData) => {
    updateMutation.mutate({
      ...data,
      description: data.description?.trim() ?? undefined,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        reorderMutation.mutate({
          galleryId: gallery.id,
          imageIds: newOrder.map((img) => img.id),
        });

        return newOrder;
      });
    }
  };

  const handleDeleteImage = (imageId: string) => {
    setPendingDeleteImageId(imageId);
  };

  const confirmDeleteImage = () => {
    if (!pendingDeleteImageId) return;
    const idToDelete = pendingDeleteImageId;
    setPendingDeleteImageId(null);
    setImages((prev) => prev.filter((img) => img.id !== idToDelete));
    deleteImageMutation.mutate(idToDelete);
  };

  const isUploading = uploadFiles.isPending || addImagesMutation.isPending;
  const isSubmitting = updateMutation.isPending || reorderMutation.isPending;
  const isDeleting = deleteGalleryMutation.isPending;
  const isDeletingImage = deleteImageMutation.isPending;

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

  /** Real images when there are any; sample stand-ins so the preview is never blank. */
  const previewImages = useMemo(
    () =>
      images.length > 0
        ? images.map((image) => ({
            id: image.id,
            url: image.url,
            altText: image.altText,
            caption: image.caption,
          }))
        : SAMPLE_IMAGES,
    [images],
  );

  const usingSampleImages = images.length === 0;
  const noRealCaptions =
    !usingSampleImages && images.every((image) => !image.caption);

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

  return (
    <>
      <Form {...form}>
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
              <h1 className="text-base font-medium">{gallery.name} Gallery</h1>
              <Badge variant="outline">{images.length} images</Badge>
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
            {/* Same More-options menu as Products. No "View on storefront":
                galleries have no public route of their own — they only ever
                surface embedded in a page, post or template field. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only ml-2 sm:not-sr-only">
                    More Options
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={isSubmitting || !isDirty}
                  onClick={() => form.reset()}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={
                    isSubmitting || isUploading || duplicateMutation.isPending
                  }
                  onClick={() => duplicateMutation.mutate({ id: gallery.id })}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  disabled={isSubmitting || isUploading}
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || !isDirty}
              onClick={(e) => void form.handleSubmit(onSubmit)(e)}
            >
              {isSubmitting ? (
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

        <div className="admin-container">
          <Tabs defaultValue="images" className="space-y-6">
            <TabsList>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Images Tab */}
            <TabsContent value="images" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add Images</CardTitle>
                  <CardDescription>
                    Images are uploaded immediately. Max 5 MB per image.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UploadDropzone
                    control={uploadFiles.control}
                    accept="image/*"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Images ({images.length})</CardTitle>
                  <CardDescription>
                    Drag and drop to reorder images
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DndContext
                    id={dndId}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={images.map((img) => img.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                        {images.map((image) => (
                          <SortableImage
                            key={image.id}
                            image={image}
                            onDelete={handleDeleteImage}
                            onEdit={setEditingImage}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {images.length === 0 && (
                    <div className="text-muted-foreground py-12 text-center">
                      <p>No images yet. Upload some to get started.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gallery Information</CardTitle>
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
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={NAME_MAX} />
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
                    {/* A grid, not a stack: a 4-option Columns select and a
                        0–64 Gap box have no business filling the whole card.
                        `items-start` because FormItem is itself a grid — without
                        it a short-description cell stretches to its neighbour's
                        height and its label and control drift apart. */}
                    <CardContent className="grid items-start gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="layout"
                        render={({ field }) => {
                          const selected = LAYOUT_OPTIONS.find(
                            (option) => option.value === field.value,
                          );
                          return (
                            // Hand-rolled rather than SelectFormField: Radix
                            // portals the SELECTED item's body into the closed
                            // trigger, so the rich glyph + name + description
                            // rows below would render inside it and inflate it
                            // into a two-line block taller than every other
                            // control. Passing explicit children to
                            // `SelectValue` suppresses that portal, keeping the
                            // descriptions in the open list where they belong.
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
                                      // Radix derives typeahead from the
                                      // item's textContent, so without this
                                      // the rich body makes typing "gr" match
                                      // against "GridEqual-sized images in
                                      // rows and columns" instead of "Grid".
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
                            // Hand-rolled rather than SelectFormField: this
                            // value is a NUMBER, and the shared wrapper always
                            // hands `field.onChange` the raw string.
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
                          // `?? 16` and NOT `|| 16`: the schema default is 16,
                          // but 0 is a legitimate gap ("touch edge to edge"),
                          // and a falsy check would bounce it back to 16.
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
                            {
                              value: "original",
                              label: "Original — Natural size",
                            },
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
                          // reveals it: a naked half-width select wedged between
                          // two full-width bordered switch rows reads as a
                          // broken layout, and the left rule shows the
                          // dependency on "Show captions".
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
                    scrolled against a preview that stays in view; top-20 clears
                    the sticky admin-form-toolbar above it. */}
                <div>
                  <Card className="lg:sticky lg:top-20">
                    <CardHeader>
                      <CardTitle>Preview</CardTitle>
                      <CardDescription>
                        The same component your storefront renders, drawn with
                        the settings above
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* `inert`, and `enableLightbox` forced off in
                          previewGallery: this is a presentation surface, not a
                          working gallery. Without it the renderer's image
                          buttons are focusable, its carousel arrows carry no
                          `type` (a submit button anywhere inside a <form>), and
                          a stray click would open the lightbox Dialog over the
                          form. inert also keeps this duplicate copy of the
                          images out of the accessibility tree. */}
                      <div
                        inert
                        className="bg-background overflow-hidden rounded-lg border p-3"
                      >
                        <GalleryRenderer gallery={previewGallery} />
                      </div>

                      {usingSampleImages && (
                        <p className="text-muted-foreground text-xs">
                          Sample images — add your own in the Images tab and
                          they will appear here.
                        </p>
                      )}
                      {showCaptions && usingSampleImages && (
                        <p className="text-muted-foreground text-xs">
                          Captions shown are sample text.
                        </p>
                      )}
                      {showCaptions && noRealCaptions && (
                        <p className="text-muted-foreground text-xs">
                          None of these images have a caption yet, so nothing
                          shows. Add captions per image in the Images tab.
                        </p>
                      )}
                      {enableLightbox && (
                        <p className="text-muted-foreground text-xs">
                          Lightbox is on: visitors can click an image to open it
                          full-screen. It is disabled in this preview so it
                          cannot cover the form.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {editingImage && (
            <ImageEditModal
              image={editingImage}
              isOpen={true}
              onClose={() => setEditingImage(null)}
              onSuccess={() => router.refresh()}
            />
          )}
        </div>
      </Form>

      {/* Delete Gallery Dialog. Two branches, mirroring the list page: an
          embedded gallery cannot be deleted at all, so offering a Delete button
          that can only ever produce a CONFLICT toast is worse than not offering
          one. The server guard stays the enforcement if this map is stale. */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          {galleryUsage ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {`Can’t delete “${gallery.name}”`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {`This gallery is still embedded on your storefront, so deleting it would leave those pages broken. Used on: ${usageLocations}. Remove it from ${
                    galleryUsage.count === 1 ? "that place" : "those places"
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
                <AlertDialogTitle>
                  {`Delete “${gallery.name}”?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {images.length === 0
                    ? "This permanently deletes the gallery. This action cannot be undone."
                    : `This permanently deletes the gallery and its ${images.length} ${
                        images.length === 1 ? "image" : "images"
                      }, including the stored files. This action cannot be undone.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                {/* `variant`, NOT className — AlertDialogAction wraps a
                    `Button … asChild`, and Slot concatenates without
                    tailwind-merge, so `className="bg-destructive"` renders
                    black over Button's own bg-primary. */}
                <AlertDialogAction
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    deleteGalleryMutation.mutate(gallery.id);
                  }}
                  // Until the usage map has loaded we don't yet know which
                  // branch is right; deleting on a guess is how the owner gets
                  // a raw CONFLICT toast instead of an explanation.
                  disabled={isDeleting || usageQuery.isLoading}
                >
                  {isDeleting
                    ? "Deleting…"
                    : usageQuery.isLoading
                      ? "Checking…"
                      : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Image Dialog */}
      <AlertDialog
        open={pendingDeleteImageId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteImageId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingImage}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteImage();
              }}
              disabled={isDeletingImage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingImage ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
