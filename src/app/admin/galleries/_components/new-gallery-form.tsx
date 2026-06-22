"use client";

import { useCallback, useRef, useState } from "react";
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { PendingImageGrid } from "~/components/inputs/pending-image-grid";

import { LayoutPreview } from "./layout-preview";

// Mirrors galleryCreateSchema caps in src/lib/validators/gallery.ts
const NAME_MAX = 120;
const DESCRIPTION_MAX = 1000;

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
  const showCaptions = form.watch("showCaptions");
  const isDirty = form.formState.isDirty || upload.pendingFiles.length > 0;
  const isProcessing =
    isSaving || upload.isUploading || createMutation.isPending;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="min-h-screen bg-muted/40"
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

          {/* Layout Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Layout Settings</CardTitle>
              <CardDescription>
                Choose how your gallery will be displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="layout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Layout Style</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="grid">
                          <div className="flex items-center gap-2">
                            {/* A2: decorative glyph is aria-hidden */}
                            <span aria-hidden="true">⊞</span>
                            <div>
                              <div className="font-medium">Grid</div>
                              <div className="text-xs text-muted-foreground">
                                Equal-sized images in rows and columns
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="masonry">
                          <div className="flex items-center gap-2">
                            <span aria-hidden="true">▦</span>
                            <div>
                              <div className="font-medium">Masonry</div>
                              <div className="text-xs text-muted-foreground">
                                Pinterest-style cascading layout
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="carousel">
                          <div className="flex items-center gap-2">
                            <span aria-hidden="true">⊏</span>
                            <div>
                              <div className="font-medium">Carousel</div>
                              <div className="text-xs text-muted-foreground">
                                Slideshow with navigation
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="collage">
                          <div className="flex items-center gap-2">
                            <span aria-hidden="true">▤</span>
                            <div>
                              <div className="font-medium">Collage</div>
                              <div className="text-xs text-muted-foreground">
                                Mixed sizes arrangement
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="justified">
                          <div className="flex items-center gap-2">
                            <span aria-hidden="true">▬</span>
                            <div>
                              <div className="font-medium">Justified</div>
                              <div className="text-xs text-muted-foreground">
                                Flickr-style justified rows
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(layout === "grid" || layout === "masonry") && (
                <>
                  <FormField
                    control={form.control}
                    name="columns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Columns</FormLabel>
                        <Select
                          value={field.value.toString()}
                          onValueChange={(v) => field.onChange(parseInt(v))}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gap between images (px)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={64}
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 16)
                            }
                          />
                        </FormControl>
                        <p className="text-muted-foreground text-xs">
                          Recommended: 8–24px
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {layout === "grid" && (
                <FormField
                  control={form.control}
                  name="aspectRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aspect Ratio</FormLabel>
                      <Select
                        value={field.value ?? "1:1"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1:1">1:1 — Square</SelectItem>
                          <SelectItem value="4:3">4:3 — Landscape</SelectItem>
                          <SelectItem value="16:9">
                            16:9 — Widescreen
                          </SelectItem>
                          <SelectItem value="3:4">3:4 — Portrait</SelectItem>
                          <SelectItem value="original">
                            Original — Natural size
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card>
            <CardHeader>
              <CardTitle>Display Options</CardTitle>
              <CardDescription>
                Configure how images are displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="showCaptions"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Show Image Captions</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Display captions below or over images
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showCaptions && (
                <FormField
                  control={form.control}
                  name="captionStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caption Style</FormLabel>
                      <Select
                        value={field.value ?? "overlay"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="overlay">
                            Always visible
                          </SelectItem>
                          <SelectItem value="hover">Show on hover</SelectItem>
                          <SelectItem value="below">Below image</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="enableLightbox"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Lightbox</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Allow users to view full-size images
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Layout Preview</CardTitle>
              <CardDescription>
                How your gallery layout will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LayoutPreview
                layout={layout}
                columns={columns}
                gap={gap}
                aspectRatio={aspectRatio}
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
