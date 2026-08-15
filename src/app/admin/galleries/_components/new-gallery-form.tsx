"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ImagePlus, PlusCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { GalleryCreateData } from "~/lib/validators/gallery";
import { cn } from "~/lib/utils";
import { galleryCreateSchema } from "~/lib/validators/gallery";
import { api } from "~/trpc/react";
import { useDeferredImageUpload } from "~/hooks/use-deferred-image-upload";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
        form.reset(NEW_GALLERY_DEFAULTS);
        toast.success("Gallery created — add another");
        router.push("/admin/galleries/new");
      } else {
        toast.success(message);
        router.push(`/admin/galleries/${data.id}`);
      }
    },
    onError: (error, variables) => {
      createAnotherRef.current = false;
      setIsSaving(false);
      toast.dismiss();
      toast.error(error.message || "Failed to create gallery");
      // If the upload succeeded but the DB write failed, discard the orphaned
      // S3 objects so they don't accumulate.
      if (variables.images && variables.images.length > 0) {
        upload.discard(variables.images.map((img) => img.url));
      }
    },
  });

  const onSubmit = useCallback(
    async (formData: GalleryCreateData) => {
      setIsSaving(true);
      toast.loading(
        upload.pendingFiles.length > 0
          ? "Uploading images…"
          : "Creating gallery…",
      );

      try {
        if (upload.pendingFiles.length > 0) {
          // uploadAll() handles its own partial-upload cleanup on failure
          const uploadedInfos = await upload.uploadAll();

          toast.dismiss();
          toast.loading("Creating gallery…");

          const images = uploadedInfos.map(({ url, width, height }) => ({
            url,
            altText: "" as string,
            caption: "" as string,
            ...(width !== undefined && height !== undefined
              ? { width, height }
              : {}),
          }));

          createMutation.mutate({ ...formData, images });
        } else {
          createMutation.mutate({ ...formData });
        }
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
    [upload, createMutation],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    upload.addFiles(files);
    // Reset input so the same files can be re-selected
    e.target.value = "";
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
   * the images already staged for upload (their local object URLs), else inline
   * sample placeholders. Adapted here rather than in `GalleryRenderer` — the
   * renderer's contract is a saved gallery.
   */
  const previewImages = useMemo(
    () =>
      upload.pendingFiles.length > 0
        ? upload.pendingFiles.map((file, index) => ({
            id: file.id,
            url: file.previewUrl,
            altText: "",
            // Per-image captions are only editable after the gallery exists, so
            // there is nothing real to show here — see the note under the card.
            caption: `Sample caption ${index + 1}`,
          }))
        : SAMPLE_IMAGES,
    [upload.pendingFiles],
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

  const isDirty = form.formState.isDirty || upload.pendingFiles.length > 0;
  const isProcessing =
    isSaving || upload.isUploading || createMutation.isPending;

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

          {/* Images — deferred upload */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>
                Select images to add on save. Nothing is uploaded until you
                click Save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label
                htmlFor="pending-image-input"
                className={cn(
                  "border-input text-foreground flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 transition-colors",
                  isProcessing
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-accent",
                )}
              >
                <ImagePlus className="mb-2 h-6 w-6" aria-hidden="true" />
                <span className="text-sm font-semibold">
                  Click to select images
                </span>
                <span className="text-muted-foreground mt-1 text-xs">
                  JPEG, PNG, WebP, GIF, AVIF — max 5 MB each
                </span>
                <input
                  id="pending-image-input"
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={isProcessing}
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>

              {upload.pendingFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">
                    {upload.pendingFiles.length}{" "}
                    {upload.pendingFiles.length === 1 ? "image" : "images"}{" "}
                    selected — drag to reorder
                  </p>
                  <PendingImageGrid
                    items={upload.pendingFiles}
                    onReorder={upload.reorder}
                    onRemove={upload.removeFile}
                  />
                </div>
              )}
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
                    {upload.pendingFiles.length > 0
                      ? "Your selected images, not yet uploaded."
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
