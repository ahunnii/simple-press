"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ExternalLink,
  GripVertical,
  PlusCircle,
  Save,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { CollectionFormData } from "~/lib/validators/collections";
import type { RouterOutputs } from "~/trpc/react";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { generateCollectionSlug } from "~/lib/slug";
import { cn } from "~/lib/utils";
import { collectionFormSchema } from "~/lib/validators/collections";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
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
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Form, FormField } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Switch } from "~/components/ui/switch";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  collection?: RouterOutputs["collections"]["getById"];
  allProducts: RouterOutputs["product"]["secureGetAll"];
};

type ProductSummary = {
  id: string;
  name: string;
  price: number;
  images: { url: string }[];
};

function SortableProductRow({
  product,
  onRemove,
}: {
  product: ProductSummary;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-3 rounded border p-3"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="focus-visible:ring-ring text-muted-foreground hover:text-foreground flex h-9 w-9 cursor-move items-center justify-center focus-visible:ring-1 focus-visible:outline-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="bg-muted relative h-10 w-10 shrink-0 rounded">
        <Image
          src={product.images[0]?.url ?? "/placeholder.svg"}
          alt={product.name}
          fill
          className="rounded object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-muted-foreground text-xs">
          ${(product.price / 100).toFixed(2)}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Remove ${product.name}`}
        className="focus-visible:ring-ring text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full focus-visible:ring-1 focus-visible:outline-none"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function OgImageUploader({
  file,
  existingUrl,
  fileInputRef,
  onFileChange,
  onRemove,
  disabled,
}: {
  file: File | null;
  existingUrl?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (f: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewUrl = objectUrl ?? existingUrl ?? null;

  return (
    <div className="space-y-2">
      <input
        ref={(el) => {
          (
            fileInputRef as React.MutableRefObject<HTMLInputElement | null>
          ).current = el;
        }}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileChange(f);
          e.target.value = "";
        }}
      />
      {previewUrl && (
        <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="OG image preview"
            className="h-16 w-16 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">
              {file
                ? "New image selected. Upload on submit."
                : "Existing image."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label="Remove image"
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className="w-full"
      >
        <Upload className="mr-2 h-4 w-4" />
        {previewUrl ? "Replace image" : "Choose image"}
      </Button>
    </div>
  );
}

const NEW_COLLECTION_DEFAULTS = {
  published: true,
  name: "",
  description: "",
  imageUrl: undefined,
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogImage: undefined,
  imageFile: undefined,
  productIds: [] as string[],
} as const;

export function CollectionForm({ collection, allProducts }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const ogImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const createAnotherRef = useRef<boolean>(false);
  const utils = api.useUtils();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // OG image state — managed outside RHF (same pattern as product form)
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [ogImageRemoved, setOgImageRemoved] = useState(false);

  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionFormSchema),
    mode: "onTouched",
    defaultValues: {
      ...collection,
      published: collection?.published ?? true,
      name: collection?.name ?? "",
      description: collection?.description ?? "",
      imageUrl: collection?.imageUrl ?? undefined,
      metaTitle: collection?.metaTitle ?? "",
      metaDescription: collection?.metaDescription ?? "",
      metaKeywords: collection?.metaKeywords ?? "",
      ogImage: collection?.ogImage ?? undefined,
      imageFile: undefined,
      productIds:
        collection?.collectionProducts.map((cp) => cp.product.id) ?? [],
    },
  });

  const imageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  const ogImageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "OG image upload failed.");
    },
  });

  const createMutation = api.collections.create.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      void utils.collections.invalidate();

      if (createAnotherRef.current) {
        createAnotherRef.current = false;
        // Reset all form state for a fresh create
        form.reset(NEW_COLLECTION_DEFAULTS);
        setProductSearch("");
        setOgImageFile(null);
        setOgImageRemoved(false);
        // Clear the image file inputs so the same file can be re-selected
        if (imageFileInputRef.current) imageFileInputRef.current.value = "";
        if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
        toast.success("Collection created — add another");
        router.push("/admin/collections/new");
      } else {
        toast.success("Collection created successfully");
        router.push(`/admin/collections/${data.id}`);
      }
    },
    onError: (err) => {
      createAnotherRef.current = false;
      toast.dismiss();
      applyTrpcErrorToForm(form, err, {
        fieldMap: { "not found in your store": "productIds" },
        fallbackMessage: "Failed to create collection",
      });
    },
    onMutate: () => {
      toast.loading("Creating collection...");
    },
  });

  const updateMutation = api.collections.update.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Collection updated successfully");

      void utils.collections.invalidate();
      const values = form.getValues();
      form.reset({
        ...values,
        name: data.name,
        description: data.description ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
        metaKeywords: data.metaKeywords ?? undefined,
        ogImage: data.ogImage ?? undefined,
      });
      setOgImageFile(null);
      setOgImageRemoved(false);
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      applyTrpcErrorToForm(form, err, {
        fieldMap: { "not found in your store": "productIds" },
        fallbackMessage: "Failed to update collection",
      });
    },
    onMutate: () => {
      toast.loading("Updating collection...");
    },
  });

  const deleteMutation = api.collections.delete.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Collection deleted successfully");
      void utils.collections.invalidate();
      router.push("/admin/collections");
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to delete collection");
    },
    onMutate: () => {
      toast.loading("Deleting collection...");
    },
  });

  const onSubmit = async (data: CollectionFormData) => {
    let imageUrl: string | null | undefined;
    const imageFile = data.imageFile;
    if (imageFile === null) {
      imageUrl = null;
    } else if (imageFile instanceof File) {
      try {
        const response = await imageUploader.upload(imageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) imageUrl = fileLocation;
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    } else {
      imageUrl = data.imageUrl ?? undefined;
    }

    // Resolve ogImage: upload new file, keep existing URL, or clear
    let resolvedOgImage: string | null;
    if (ogImageFile instanceof File) {
      try {
        const response = await ogImageUploader.upload(ogImageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        resolvedOgImage = fileLocation || null;
      } catch {
        toast.error("Failed to upload Open Graph image.");
        return;
      }
    } else if (ogImageRemoved) {
      resolvedOgImage = null;
    } else {
      resolvedOgImage = data.ogImage ?? null;
    }

    if (collection?.id) {
      updateMutation.mutate({
        id: collection.id,
        name: data.name,
        description: data.description ?? undefined,
        imageUrl,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
        metaKeywords: data.metaKeywords ?? undefined,
        ogImage: resolvedOgImage,
        productIds: data.productIds,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        description: data.description ?? undefined,
        imageUrl,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
        metaKeywords: data.metaKeywords ?? undefined,
        ogImage: resolvedOgImage,
        productIds: data.productIds,
      });
    }
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    ogImageUploader.isPending;
  const isDeleting = deleteMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="bg-muted/30 min-h-screen"
        >
          <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
            <div className="toolbar-info">
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/collections">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <h1 className="truncate text-base font-medium">
                  {collection?.id
                    ? (collection?.name ?? "Edit Collection")
                    : "New Collection"}
                </h1>

                <span
                  className={cn(
                    `admin-status-badge`,
                    `${
                      isDirty ? "isDirty" : "isPublished"
                    } ${!collection?.id ? "isNew" : ""}`,
                  )}
                >
                  {isDirty
                    ? "Unsaved Changes"
                    : !collection?.id
                      ? "Draft"
                      : "Saved"}
                </span>
              </div>
            </div>

            <div className="toolbar-actions">
              {collection?.id && collection.published && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden sm:inline-flex"
                >
                  <a
                    href={`/collections/${collection.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View on storefront"
                    title="View on storefront"
                  >
                    <ExternalLink className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">View on storefront</span>
                  </a>
                </Button>
              )}

              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <div className="flex shrink-0 items-center gap-2">
                    <Label htmlFor="published" className="text-sm">
                      Published
                    </Label>
                    <Switch
                      id="published"
                      aria-label="Published"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />

              {collection && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}

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

              {!collection?.id && (
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => {
                    createAnotherRef.current = true;
                  }}
                  className="hidden sm:inline-flex"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Save &amp; create another
                </Button>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                onClick={() => {
                  createAnotherRef.current = false;
                }}
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
          <div className="admin-container space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="col-span-1 space-y-4">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Collection name and description
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InputFormField
                      form={form}
                      name="name"
                      label="What is the name of this collection?"
                      placeholder="Summer Collection"
                      required
                    />

                    {/* URL preview + rename warning */}
                    {(() => {
                      const watchedName = form.watch("name") ?? "";
                      const previewSlug = generateCollectionSlug(watchedName);

                      const showRenameWarning =
                        !!collection?.id &&
                        watchedName.trim() !== "" &&
                        watchedName.trim() !== collection.name &&
                        previewSlug !== collection.slug;

                      return (
                        <div className="space-y-2">
                          {/* Storefront URL line */}
                          <p className="text-muted-foreground text-xs">
                            Storefront URL:{" "}
                            <span className="font-mono">
                              {collection?.id
                                ? `/collections/${collection.slug || "…"}`
                                : `/collections/${previewSlug || "…"}`}
                            </span>
                          </p>

                          {/* Rename warning */}
                          {showRenameWarning && (
                            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                              <div className="space-y-0.5">
                                <p className="font-medium">
                                  Heads up — this will change the
                                  collection&apos;s URL.
                                </p>
                                <p className="text-amber-700">
                                  Saving will change the public URL from{" "}
                                  <span className="font-mono">
                                    /collections/{collection.slug}
                                  </span>{" "}
                                  to{" "}
                                  <span className="font-mono">
                                    /collections/{previewSlug}
                                  </span>
                                  . Anyone with the old link (including
                                  bookmarks and search engines) will get a 404.
                                  We don&apos;t set up a redirect automatically.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <TextareaFormField
                      form={form}
                      name="description"
                      label="Describe this collection in a sentence or two"
                      placeholder="Summer Collection: Bright and Vibrant Styles"
                      rows={4}
                    />

                    <ImageUploadFormField
                      form={form}
                      name="imageFile"
                      label="Upload an image that represents this collection"
                      description="This would be the first thing that people see associated with this collection"
                      existingPreviewUrl={collection?.imageUrl ?? undefined}
                      inputRef={imageFileInputRef}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="col-span-1 space-y-4">
                {/* SEO */}
                <Card>
                  <CardHeader>
                    <CardTitle>SEO</CardTitle>
                    <CardDescription>
                      Fine tune the meta title and description to help boost
                      your SEO for this collection.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const metaTitleLen = form.watch("metaTitle")?.length ?? 0;
                      const metaTitleOver = metaTitleLen > 60;
                      return (
                        <InputFormField
                          form={form}
                          name="metaTitle"
                          label="Meta Title"
                          placeholder="Summer Collection"
                          description={
                            <span
                              className={
                                metaTitleOver ? "text-destructive" : undefined
                              }
                            >
                              {metaTitleLen}/60 characters (optimal: 50–60)
                            </span>
                          }
                        />
                      );
                    })()}
                    {(() => {
                      const metaDescLen =
                        form.watch("metaDescription")?.length ?? 0;
                      const metaDescOver = metaDescLen > 160;
                      return (
                        <TextareaFormField
                          form={form}
                          name="metaDescription"
                          label="Meta Description"
                          placeholder="Summer Collection: Bright and Vibrant Styles"
                          rows={3}
                          description={
                            <span
                              className={
                                metaDescOver ? "text-destructive" : undefined
                              }
                            >
                              {metaDescLen}/160 characters (optimal: 150–160)
                            </span>
                          }
                        />
                      );
                    })()}
                    <InputFormField
                      form={form}
                      name="metaKeywords"
                      label="Meta Keywords"
                      placeholder="e.g., summer, fashion, new arrivals"
                      description="Comma-separated keywords"
                    />
                    <div className="space-y-2">
                      <p className="text-sm leading-none font-medium">
                        Open Graph Image
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Shown when this collection is shared on social media.
                        Recommended: 1200×630px.
                      </p>
                      <OgImageUploader
                        file={ogImageFile}
                        existingUrl={
                          ogImageRemoved
                            ? undefined
                            : (collection?.ogImage ?? undefined)
                        }
                        fileInputRef={ogImageFileInputRef}
                        onFileChange={(f) => {
                          setOgImageFile(f);
                          setOgImageRemoved(false);
                        }}
                        onRemove={() => {
                          setOgImageFile(null);
                          setOgImageRemoved(true);
                        }}
                        disabled={isSubmitting}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="col-span-full">
                {/* Products */}
                <Card>
                  <CardHeader>
                    <CardTitle>Products</CardTitle>
                    <CardDescription>
                      Select products to include in this collection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="productIds"
                      render={({ field }) => {
                        const ids = field.value;

                        // Preserve existing order when toggling: append new,
                        // filter out removed.
                        const toggleProduct = (productId: string) => {
                          if (ids.includes(productId)) {
                            field.onChange(
                              ids.filter((id) => id !== productId),
                            );
                          } else {
                            field.onChange([...ids, productId]);
                          }
                        };

                        const handleDragEnd = (event: DragEndEvent) => {
                          const { active, over } = event;
                          if (over && active.id !== over.id) {
                            const oldIndex = ids.indexOf(active.id as string);
                            const newIndex = ids.indexOf(over.id as string);
                            field.onChange(arrayMove(ids, oldIndex, newIndex));
                          }
                        };

                        const filteredProducts = productSearch.trim()
                          ? (allProducts ?? []).filter((p) =>
                              p.name
                                .toLowerCase()
                                .includes(productSearch.toLowerCase().trim()),
                            )
                          : (allProducts ?? []);

                        const productMap = new Map(
                          (allProducts ?? []).map((p) => [p.id, p]),
                        );
                        const selectedProducts = ids
                          .map((id) => productMap.get(id))
                          .filter(
                            (p): p is NonNullable<typeof p> => p !== undefined,
                          );

                        return (
                          <>
                            {/* Sortable ordered list of selected products */}
                            {ids.length > 0 && (
                              <div className="mb-4">
                                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                                  Selected — drag to reorder
                                </p>
                                <DndContext
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  modifiers={[restrictToVerticalAxis]}
                                  onDragEnd={handleDragEnd}
                                >
                                  <SortableContext
                                    items={ids}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    <div className="space-y-1.5">
                                      {selectedProducts.map((product) => (
                                        <SortableProductRow
                                          key={product.id}
                                          product={product}
                                          onRemove={() =>
                                            toggleProduct(product.id)
                                          }
                                        />
                                      ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                              </div>
                            )}

                            {/* Search + checkbox list for adding/removing */}
                            <div className="relative mb-3">
                              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                              <Input
                                type="search"
                                placeholder="Search products..."
                                value={productSearch}
                                onChange={(e) =>
                                  setProductSearch(e.target.value)
                                }
                                className="pl-10"
                              />
                            </div>

                            <ScrollArea className="h-72 min-h-0 overflow-hidden">
                              <div className="space-y-2">
                                {filteredProducts.length === 0 ? (
                                  <p className="text-muted-foreground py-6 text-center text-sm">
                                    No products match &ldquo;{productSearch}
                                    &rdquo;
                                  </p>
                                ) : (
                                  filteredProducts.map((product) => (
                                    <div
                                      key={product.id}
                                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded border p-3"
                                      onClick={() => toggleProduct(product.id)}
                                    >
                                      <span
                                        className="shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                      >
                                        <Checkbox
                                          checked={ids.includes(product.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked === "indeterminate")
                                              return;
                                            toggleProduct(product.id);
                                          }}
                                        />
                                      </span>
                                      <div className="bg-muted relative h-12 w-12 shrink-0 rounded">
                                        <Image
                                          src={
                                            product.images[0]?.url ??
                                            "/placeholder.svg"
                                          }
                                          alt={product.name}
                                          fill
                                          className="rounded object-cover"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium">
                                          {product.name}
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                          ${(product.price / 100).toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>

                            <p className="text-muted-foreground mt-4 text-sm">
                              {ids.length} product
                              {ids.length !== 1 ? "s" : ""} selected
                              {productSearch &&
                                filteredProducts.length !==
                                  (allProducts?.length ?? 0) && (
                                  <span className="text-muted-foreground/70">
                                    {" "}
                                    · showing {filteredProducts.length} of{" "}
                                    {allProducts?.length ?? 0}
                                  </span>
                                )}
                            </p>
                          </>
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{form.watch("name")}&quot;?
              This will remove the collection but won&apos;t delete the products
              in it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(collection?.id ?? "");
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
