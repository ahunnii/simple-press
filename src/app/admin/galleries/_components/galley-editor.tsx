"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { Gallery, GalleryImage } from "generated/prisma";
import { useId, useState } from "react";
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
import { ArrowLeft, Save, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { UploadDropzone } from "~/components/ui/upload-dropzone";

import { ImageEditModal } from "./image-edit-modal";
import { SortableImage } from "./sortable-image";

// Mirrors galleryUpdateSchema caps in src/lib/validators/gallery.ts
const NAME_MAX = 120;
const DESCRIPTION_MAX = 1000;

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
      toast.error(error.message ?? "Failed to delete gallery");
    },
    onMutate: () => {
      toast.loading("Deleting gallery...");
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
  const showCaptions = form.watch("showCaptions");

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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmitting || isUploading}
              onClick={() => setShowDeleteDialog(true)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting || !isDirty}
              onClick={() => form.reset()}
              className="hidden md:inline-flex"
            >
              Reset
            </Button>

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
                  <p className="text-muted-foreground text-sm">
                    Images are uploaded immediately. Max 5 MB per image.
                  </p>
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
                  <p className="text-sm text-gray-600">
                    Drag and drop to reorder images
                  </p>
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
                    <div className="py-12 text-center text-gray-500">
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

              <Card>
                <CardHeader>
                  <CardTitle>Layout Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="layout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Layout Style</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="grid">Grid</SelectItem>
                            <SelectItem value="masonry">Masonry</SelectItem>
                            <SelectItem value="carousel">Carousel</SelectItem>
                            <SelectItem value="collage">Collage</SelectItem>
                            <SelectItem value="justified">Justified</SelectItem>
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
                            <FormLabel>Gap (px)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={64}
                                value={field.value}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
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
                              <SelectItem value="4:3">
                                4:3 — Landscape
                              </SelectItem>
                              <SelectItem value="16:9">
                                16:9 — Widescreen
                              </SelectItem>
                              <SelectItem value="3:4">
                                3:4 — Portrait
                              </SelectItem>
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

                  <FormField
                    control={form.control}
                    name="showCaptions"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Show Captions</FormLabel>
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
                              <SelectItem value="hover">
                                Show on hover
                              </SelectItem>
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
                          <FormLabel>Enable Lightbox</FormLabel>
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

      {/* Delete Gallery Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete gallery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this gallery? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteGalleryMutation.mutate(gallery.id);
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
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
