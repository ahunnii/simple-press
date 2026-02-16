"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { Gallery, GalleryImage } from "generated/prisma";
import { useState } from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Eye,
  GripVertical,
  Loader2,
  Pencil,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { getStoredPath } from "~/lib/uploads";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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

import { ImageEditModal } from "./image-edit-modal";

type GalleryEditorProps = {
  gallery: Gallery & { images: GalleryImage[] };
  businessId: string;
};

export function GalleryEditor({ gallery }: GalleryEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Gallery settings
  const [name, setName] = useState(gallery.name);
  const [description, setDescription] = useState(gallery.description ?? "");
  const [layout, setLayout] = useState<
    "grid" | "masonry" | "carousel" | "collage" | "justified"
  >(
    gallery.layout as "grid" | "masonry" | "carousel" | "collage" | "justified",
  );
  const [columns, setColumns] = useState(gallery.columns);
  const [gap, setGap] = useState(gallery.gap);
  const [showCaptions, setShowCaptions] = useState(gallery.showCaptions);
  const [enableLightbox, setEnableLightbox] = useState(gallery.enableLightbox);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);

  // Images
  const [images, setImages] = useState(gallery.images);

  // Drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const uploadFiles = useUploadFiles({
    api: "/api/upload",
    route: "images",
    // onUploadComplete: (data) => {
    //   const newImages: FormProductImage[] = data.files.map((file, i) => ({
    //     url: getStoredPath(file),
    //     altText: null,
    //     sortOrder: images.length + i,
    //   }));
    //   if (newImages.length > 0) {
    //     onImagesChange([...images, ...newImages]);
    //   }
    // },
    onError: () => {
      alert("Failed to upload image");
    },
  });

  const updateMutation = api.gallery.update.useMutation({
    onSuccess: () => {
      toast.success("Gallery updated");
      router.refresh();
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update");
      setIsSaving(false);
    },
  });

  const reorderMutation = api.gallery.reorderImages.useMutation({
    onSuccess: () => {
      toast.success("Image order saved");
    },
  });

  const addImagesMutation = api.gallery.addImages.useMutation({
    onSuccess: () => {
      toast.success("Images added");
      router.refresh();
    },
  });

  const deleteImageMutation = api.gallery.deleteImage.useMutation({
    onSuccess: () => {
      toast.success("Image deleted");
      router.refresh();
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    updateMutation.mutate({
      id: gallery.id,
      name,
      description,
      layout,
      columns,
      gap,
      showCaptions,
      enableLightbox,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save new order
        reorderMutation.mutate({
          galleryId: gallery.id,
          imageIds: newOrder.map((img) => img.id),
        });

        return newOrder;
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // In production, upload to your storage (S3, etc.)
    // For now, using placeholder URLs

    const uploadedFiles = await uploadFiles.uploadAsync(files);

    const newImages = uploadedFiles.files.map((file) => ({
      url: getStoredPath(file), // Replace with actual upload
      altText: file.name,
      caption: "",
    }));

    addImagesMutation.mutate({
      galleryId: gallery.id,
      images: newImages,
    });
  };

  const handleDeleteImage = (imageId: string) => {
    if (confirm("Delete this image?")) {
      deleteImageMutation.mutate({ id: imageId });
      setImages(images.filter((img) => img.id !== imageId));
    }
  };

  return (
    <div className="admin-container">
      <div className="mb-8">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/galleries">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Galleries
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{gallery.name}</h1>
            <p className="mt-2 text-gray-600">{images.length} images</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <a href={`/galleries/${gallery.slug}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </a>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="images" className="space-y-6">
        <TabsList>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Images Tab */}
        <TabsContent value="images" className="space-y-6">
          {/* Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Add Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="max-w-sm"
                />
                <Button variant="outline" asChild>
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Images
                  </label>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Image Grid with Drag-and-Drop */}
          <Card>
            <CardHeader>
              <CardTitle>Images ({images.length})</CardTitle>
              <p className="text-sm text-gray-600">
                Drag and drop to reorder images
              </p>
            </CardHeader>
            <CardContent>
              <DndContext
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
                        onEdit={setEditingImage} // ADD THIS
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
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Layout Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="layout">Layout Style</Label>
                <Select
                  value={layout}
                  onValueChange={(v) =>
                    setLayout(
                      v as
                        | "grid"
                        | "masonry"
                        | "carousel"
                        | "collage"
                        | "justified",
                    )
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="masonry">Masonry</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="collage">Collage</SelectItem>
                    <SelectItem value="justified">Justified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {layout === "grid" && (
                <>
                  <div>
                    <Label htmlFor="columns">Columns</Label>
                    <Select
                      value={columns.toString()}
                      onValueChange={(v) => setColumns(parseInt(v))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 columns</SelectItem>
                        <SelectItem value="3">3 columns</SelectItem>
                        <SelectItem value="4">4 columns</SelectItem>
                        <SelectItem value="5">5 columns</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="gap">Gap (px)</Label>
                    <Input
                      id="gap"
                      type="number"
                      value={gap}
                      onChange={(e) => setGap(parseInt(e.target.value))}
                      min={0}
                      max={64}
                      className="mt-2"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="captions">Show Captions</Label>
                <Switch
                  id="captions"
                  checked={showCaptions}
                  onCheckedChange={setShowCaptions}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="lightbox">Enable Lightbox</Label>
                <Switch
                  id="lightbox"
                  checked={enableLightbox}
                  onCheckedChange={setEnableLightbox}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADD: Edit Modal */}
      {editingImage && (
        <ImageEditModal
          image={editingImage}
          isOpen={true}
          onClose={() => setEditingImage(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}

// Sortable Image Component
function SortableImage({
  image,
  onDelete,
  onEdit,
}: {
  image: GalleryImage;
  onDelete: (id: string) => void;
  onEdit: (image: GalleryImage) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
    >
      <img
        src={image.url}
        alt={image.altText ?? ""}
        className="h-full w-full object-cover"
      />

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 cursor-grab rounded bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-white" />
      </div>

      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {/* ADD: Edit Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(image)}
          className="h-8 w-8 p-0"
        >
          <Pencil className="h-4 w-4" />
        </Button>

        {/* Delete Button */}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(image.id)}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Caption Indicator */}
      {image.caption && (
        <div className="absolute right-0 bottom-0 left-0 truncate bg-black/70 p-2 text-xs text-white">
          {image.caption}
        </div>
      )}

      {/* Alt Text Indicator */}
      {image.altText && (
        <div className="absolute bottom-0 left-0 rounded-tr bg-blue-600 px-2 py-0.5 text-xs text-white">
          ALT
        </div>
      )}
    </div>
  );
}
