"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Trash2, Upload, X, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { FormProductImage, FormVariant } from "../_validators/schema";
import type { ProductFormSchema } from "~/lib/validators/product";
import type { RouterOutputs } from "~/trpc/react";
import { cn, sanitizeSlugInput, slugify } from "~/lib/utils";
import { productFormSchema } from "~/lib/validators/product";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { NumberInput } from "~/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Checkbox } from "~/components/ui/checkbox";
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { getExistingVariantOptions } from "../_utils/existing-variant-options";
import { ImageUploader } from "./image-uploader";
import { ProductFeaturesField } from "./product-features-field";
import { VariantManager } from "./variant-manager";

type Props = {
  product?: RouterOutputs["product"]["secureGet"];
  galleriesEnabled?: boolean;
  collectionsEnabled?: boolean;
  allCollections?: RouterOutputs["collections"]["getAll"];
  pools?: RouterOutputs["baseInventoryUnit"]["list"];
};

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] } as const;

function parseStoredAdditionalFields(raw: unknown) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  return raw as {
    additionalInformation?: unknown;
    productFeatures?: Array<{ icon: string; text: string }>;
    comingSoon?: boolean;
    productTagline?: string;
  };
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
    if (!file) { setObjectUrl(null); return; }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewUrl = objectUrl ?? existingUrl ?? null;

  return (
    <div className="space-y-2">
      <input
        ref={(el) => { (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el; }}
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
          <img src={previewUrl} alt="OG image preview" className="h-16 w-16 shrink-0 rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">
              {file ? "New image selected. Upload on submit." : "Existing image."}
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

function SocialPreviewCard({
  title,
  description,
  ogImageFile,
  existingOgImage,
}: {
  title: string;
  description: string;
  ogImageFile: File | null | undefined;
  existingOgImage?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!(ogImageFile instanceof File)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(ogImageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [ogImageFile]);

  const imageToShow = previewUrl ?? existingOgImage ?? null;

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      {imageToShow ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageToShow}
          alt="Open Graph preview"
          className="aspect-[1200/630] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[1200/630] items-center justify-center bg-gray-100 text-sm text-gray-400">
          1200 × 630 — no image set
        </div>
      )}
      <div className="border-t p-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          yourstore.com
        </p>
        <p className="truncate text-sm font-medium text-gray-900">{title}</p>
        {description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProductForm({ product, galleriesEnabled, collectionsEnabled, allCollections = [], pools = [] }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const ogImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const utils = api.useUtils();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Images state (kept separate as they're uploaded independently via Better Upload)
  const [images, setImages] = useState<FormProductImage[]>([]);
  const imagesToSyncRef = useRef<FormProductImage[]>([]);
  const initialImagesRef = useRef<FormProductImage[]>([]);

  // OG image state (kept separate, same pattern as gallery images)
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [ogImageRemoved, setOgImageRemoved] = useState(false);

  // Collections state
  const initialCollectionIds = product?.collectionProducts?.map((cp) => cp.collectionId) ?? [];
  const [collectionIds, setCollectionIds] = useState<string[]>(initialCollectionIds);
  const [baselineCollectionIds, setBaselineCollectionIds] = useState<string[]>(initialCollectionIds);
  const [collectionSearch, setCollectionSearch] = useState("");

  // Variants state (kept separate due to complex nested structure and VariantManager component)
  const [variants, setVariants] = useState<FormVariant[]>(
    (product?.variants as FormVariant[]) ?? [],
  );

  const storedAdditional = parseStoredAdditionalFields(
    product?.additionalFields ?? null,
  );

  // Initialize form with react-hook-form
  const form = useForm<ProductFormSchema>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      published: product?.published ?? true,
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? undefined,
      price: product?.price ? product.price / 100 : 0, // Convert cents to dollars
      compareAtPrice: product?.compareAtPrice
        ? product.compareAtPrice / 100
        : undefined,
      trackInventory: product?.trackInventory ?? false,
      inventoryQty: product?.inventoryQty ?? 0,
      allowBackorders: product?.allowBackorders ?? false,
      lowInventoryThreshold: product?.lowInventoryThreshold ?? undefined,
      baseInventoryUnitId: product?.baseInventoryUnitId ?? null,
      baseUnitsConsumed: product?.baseUnitsConsumed ?? null,
      additionalFields: {
        additionalInformation: (storedAdditional?.additionalInformation as
          | Record<string, unknown>
          | undefined) ?? { ...EMPTY_TIPTAP_DOC },
        productFeatures: storedAdditional?.productFeatures ?? [],
        comingSoon: storedAdditional?.comingSoon ?? false,
        productTagline: storedAdditional?.productTagline ?? "",
      },
      metaTitle: product?.metaTitle ?? "",
      metaDescription: product?.metaDescription ?? "",
      metaKeywords: product?.metaKeywords ?? "",
      ogImage: product?.ogImage ?? undefined,
    },
  });

  /** Re-baseline after TipTap normalizes empty doc on mount (avoids false dirty). */
  const dirtyBaselineRef = useRef(false);
  useEffect(() => {
    if (dirtyBaselineRef.current) return;
    dirtyBaselineRef.current = true;
    const raf = requestAnimationFrame(() => {
      form.reset(form.getValues());
    });
    return () => cancelAnimationFrame(raf);
  }, [form]);

  // Load existing images on mount
  useEffect(() => {
    if (product?.images) {
      const loaded = product.images.map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder,
      }));
      setImages(loaded);
      initialImagesRef.current = loaded;
    }
  }, [product]);

  const isImagesDirty = useMemo(() => {
    const initial = initialImagesRef.current;
    if (images.length !== initial.length) return true;
    return images.some((img, i) => {
      const orig = initial[i];
      return (
        !orig ||
        img.id !== orig.id ||
        img.url !== orig.url ||
        img.altText !== orig.altText ||
        img.sortOrder !== orig.sortOrder
      );
    });
  }, [images]);

  const ogImageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "OG image upload failed.");
    },
  });

  // Auto-generate slug from name (only for new products)
  const handleNameChange = (value: string | null) => {
    if (!value) return;
    if (!product) {
      form.setValue("slug", slugify(value), { shouldValidate: true });
    }
  };

  // Mutations
  const syncImagesMutation = api.product.syncImages.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to sync images");
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
      void utils.product.invalidate();
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Syncing images...");
    },
  });

  const createProductMutation = api.product.create.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to create product");
    },
    onSuccess: (data) => {
      toast.dismiss();
      void utils.product.invalidate();
      toast.success(data.message);
    },
    onMutate: () => {
      toast.loading("Creating product...");
    },
  });

  const updateProductMutation = api.product.update.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update product");
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
      void utils.product.invalidate();
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Updating product...");
    },
  });

  const deleteProductMutation = api.product.delete.useMutation({
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to delete product");
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Product deleted successfully");
      void utils.product.invalidate();
      router.push("/admin/products");
    },
    onMutate: () => {
      toast.loading("Deleting product...");
    },
  });

  const onSubmit = async (data: ProductFormSchema) => {
    // Convert price to cents
    const priceInCents = Math.round(data.price * 100);
    const compareAtPriceInCents = data.compareAtPrice
      ? Math.round(data.compareAtPrice * 100)
      : undefined;

    // Resolve ogImage URL: upload new file, keep existing URL, or clear
    let resolvedOgImage: string | null;
    if (ogImageFile instanceof File) {
      try {
        const response = await ogImageUploader.upload(ogImageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ?? "";
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

    if (product) {
      // Update existing product
      imagesToSyncRef.current = images;

      await updateProductMutation.mutateAsync({
        id: product.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        price: priceInCents,
        compareAtPrice: compareAtPriceInCents,
        published: data.published,
        trackInventory: data.trackInventory,
        allowBackorders: data.allowBackorders,
        inventoryQty: data.inventoryQty ?? 0,
        lowInventoryThreshold: data.lowInventoryThreshold ?? undefined,
        baseInventoryUnitId: data.baseInventoryUnitId ?? null,
        baseUnitsConsumed: data.baseUnitsConsumed ?? null,
        variants: variants?.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku ?? undefined,
          price: v.price ?? priceInCents,
          compareAtPrice: v.compareAtPrice ?? undefined,
          inventoryQty: v.inventoryQty,
          options: v.options,
        })),
        additionalFields: {
          additionalInformation: data.additionalFields?.additionalInformation,
          productFeatures: data.additionalFields?.productFeatures ?? [],
          comingSoon: data.additionalFields?.comingSoon ?? false,
          productTagline: data.additionalFields?.productTagline ?? undefined,
        },
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        metaKeywords: data.metaKeywords ?? null,
        ogImage: resolvedOgImage ?? null,
      });

      // New default baseline so isDirty clears (RHF only used initial defaultValues otherwise).
      form.reset(data);
      setOgImageFile(null);
      setOgImageRemoved(false);
      requestAnimationFrame(() => {
        form.reset(form.getValues());
      });

      if (product.id) {
        void syncImagesMutation.mutateAsync({
          productId: product.id,
          images: imagesToSyncRef.current,
        });

        // Sync collection memberships
        const initial = new Set(baselineCollectionIds);
        const selected = new Set(collectionIds);
        for (const id of selected) {
          if (!initial.has(id))
            await utils.client.collections.addProduct.mutate({ collectionId: id, productId: product.id });
        }
        for (const id of initial) {
          if (!selected.has(id))
            await utils.client.collections.removeProduct.mutate({ collectionId: id, productId: product.id });
        }
        setBaselineCollectionIds([...collectionIds]);
      }
    } else {
      // Create new product
      const response = await createProductMutation.mutateAsync({
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        price: priceInCents,
        published: data.published,
        trackInventory: data.trackInventory,
        allowBackorders: data.allowBackorders,
        inventoryQty: data.inventoryQty ?? 0,
        lowInventoryThreshold: data.lowInventoryThreshold ?? undefined,
        compareAtPrice: compareAtPriceInCents,
        baseInventoryUnitId: data.baseInventoryUnitId ?? null,
        baseUnitsConsumed: data.baseUnitsConsumed ?? null,
        variants: variants?.map((v) => ({
          name: v.name,
          sku: v.sku ?? undefined,
          price: v.price ?? priceInCents,
          compareAtPrice: v.compareAtPrice ?? undefined,
          inventoryQty: v.inventoryQty,
          options: v.options,
        })),
        additionalFields: {
          additionalInformation: data.additionalFields?.additionalInformation,
          productFeatures: data.additionalFields?.productFeatures ?? [],
          comingSoon: data.additionalFields?.comingSoon ?? false,
          productTagline: data.additionalFields?.productTagline ?? "",
        },
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        metaKeywords: data.metaKeywords ?? null,
        ogImage: resolvedOgImage ?? null,
      });

      if (response.productId && images.length > 0) {
        await syncImagesMutation.mutateAsync({
          productId: response.productId,
          images: images.map((image) => ({
            url: image.url,
            altText: image.altText,
            sortOrder: image.sortOrder,
          })),
        });
      }

      if (response.productId && collectionIds.length > 0) {
        for (const collectionId of collectionIds) {
          await utils.client.collections.addProduct.mutate({
            collectionId,
            productId: response.productId,
          });
        }
      }

      if (response.productId) {
        // toast.success("Product created!", {
        //   action: {
        //     label: "Create another",
        //     onClick: () => router.push("/admin/products/new"),
        //   },
        // });
        router.push(`/admin/products/${response.productId}`);
      } else {
        form.reset({ ...data });
        requestAnimationFrame(() => {
          form.reset(form.getValues());
        });
      }
    }
  };

  const isSubmitting =
    updateProductMutation.isPending ||
    createProductMutation.isPending ||
    syncImagesMutation.isPending ||
    ogImageUploader.isPending;

  const isDeleting = deleteProductMutation.isPending;

  const isCollectionsDirty = useMemo(() => {
    const initial = new Set(baselineCollectionIds);
    const current = new Set(collectionIds);
    if (initial.size !== current.size) return true;
    for (const id of current) if (!initial.has(id)) return true;
    return false;
  }, [collectionIds, baselineCollectionIds]);

  const isOgImageDirty = ogImageFile !== null || ogImageRemoved;
  const isDirty = form.formState.isDirty || isImagesDirty || isCollectionsDirty || isOgImageDirty;

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  // SEO preview values — || is intentional so empty string falls back to the default
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const seoPreviewTitle = form.watch("metaTitle") || form.watch("name") || "Product Name";
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const seoPreviewDesc = form.watch("metaDescription") || form.watch("description") || "Your product description will appear here in search results.";

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="min-h-screen bg-gray-50"
        >
          <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
            <div className="toolbar-info">
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/products">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <h1 className="truncate text-base font-medium">
                  {product
                    ? form.watch("name") || "Edit Product"
                    : "New Product"}
                </h1>

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
              {product && (
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
                onClick={() => {
                  form.reset();
                  setCollectionIds(baselineCollectionIds);
                  setOgImageFile(null);
                  setOgImageRemoved(false);
                  if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
                }}
                className="hidden md:inline-flex"
              >
                Reset
              </Button>

              <Button type="submit" size="sm" disabled={isSubmitting}>
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
            <Tabs defaultValue="basics" className="w-full">
              <TabsList>
                <TabsTrigger value="basics">Basics</TabsTrigger>
                {collectionsEnabled && (
                  <TabsTrigger value="collections">Collections</TabsTrigger>
                )}
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="additional">Additional Info</TabsTrigger>
              </TabsList>
              <TabsContent value="basics" className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="col-span-1 space-y-4">
                    {/* Basic Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>
                          Essential details about your product
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <InputFormField
                          form={form}
                          name="name"
                          label="Product Name"
                          onChangeAdditional={handleNameChange}
                          placeholder="e.g., Classic White T-Shirt"
                          required
                          autoFocus
                        />

                        <InputFormField
                          form={form}
                          name="slug"
                          label="URL Slug"
                          placeholder="classic-white-t-shirt"
                          onChange={(value) =>
                            form.setValue("slug", sanitizeSlugInput(value), {
                              shouldValidate: true,
                            })
                          }
                          required
                          description={`Used in product URL: /products/${form.watch("slug") || "your-product"}`}
                        />

                        <TextareaFormField
                          form={form}
                          name="description"
                          label="Description"
                          placeholder="Describe your product..."
                          rows={4}
                        />
                      </CardContent>
                    </Card>

                    {/* Pricing */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Pricing</CardTitle>
                        <CardDescription>
                          Set your product pricing
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {variants.length > 0 ? (
                          <p className="text-muted-foreground text-sm">
                            Pricing is managed per variant. Edit each
                            variant&apos;s price in the{" "}
                            <span className="text-foreground font-medium">
                              Product Variants
                            </span>{" "}
                            section below.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price (USD)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                        $
                                      </span>
                                      <NumberInput
                                        step="0.01"
                                        min="0"
                                        placeholder="19.99"
                                        className="pl-7"
                                        {...field}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Base price in USD (variant prices can
                                    override this)
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="compareAtPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Compare At Price (USD)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                        $
                                      </span>
                                      <NumberInput
                                        step="0.01"
                                        min="0"
                                        placeholder="24.99"
                                        className="pl-7"
                                        {...field}
                                        value={field.value}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Original price shown crossed out. Leave
                                    blank to disable the sale display.
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <div className="col-span-1 space-y-4">
                    {/* Images */}
                    <ImageUploader
                      images={images}
                      onImagesChange={setImages}
                      maxImages={10}
                    />

                    {/* Base Inventory */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Inventory</CardTitle>
                        <CardDescription>
                          Set your product inventory
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Base Unit pool selector (shown when pools exist and no variants) */}
                        {pools.length > 0 && variants.length === 0 && (
                          <div className="space-y-3 rounded-lg border p-4">
                            <div>
                              <Label className="text-sm font-medium">
                                Base Unit
                              </Label>
                              <p className="text-muted-foreground mt-0.5 text-sm">
                                Link this product to a shared inventory pool.
                                For example, if your base unit is a
                                &ldquo;4-pack Roll&rdquo; and this product is a
                                24-pack, set units consumed to 6.
                              </p>
                            </div>
                            <FormField
                              control={form.control}
                              name="baseInventoryUnitId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pool</FormLabel>
                                  <Select
                                    onValueChange={(val) =>
                                      field.onChange(
                                        val === "__none__" ? null : val,
                                      )
                                    }
                                    value={field.value ?? "__none__"}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="None — use individual inventory" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="__none__">
                                        None — use individual inventory
                                      </SelectItem>
                                      {pools.map((pool) => (
                                        <SelectItem
                                          key={pool.id}
                                          value={pool.id}
                                        >
                                          {pool.name} ({pool.inventoryQty}{" "}
                                          units)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            {form.watch("baseInventoryUnitId") && (
                              <FormField
                                control={form.control}
                                name="baseUnitsConsumed"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Units consumed per purchase
                                    </FormLabel>
                                    <FormControl>
                                      <NumberInput
                                        step="1"
                                        min="1"
                                        placeholder="e.g. 6"
                                        value={field.value}
                                        onChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      How many base units this product uses per
                                      item sold.
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        )}

                        {/* Individual inventory controls — hidden when pool is selected */}
                        {!form.watch("baseInventoryUnitId") && (
                          <>
                            <SwitchFormField
                              form={form}
                              name="trackInventory"
                              label="Track Inventory"
                              description="Enable inventory tracking for this product"
                            />

                            {form.watch("trackInventory") && (
                              <SwitchFormField
                                form={form}
                                name="allowBackorders"
                                label="Allow Backorders"
                                description="Allow customers to order when out of stock"
                              />
                            )}

                            {form.watch("trackInventory") &&
                              variants.length === 0 && (
                                <FormField
                                  control={form.control}
                                  name="inventoryQty"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Inventory Quantity</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <NumberInput
                                            step="1"
                                            min="0"
                                            placeholder="10"
                                            {...field}
                                          />
                                        </div>
                                      </FormControl>
                                      <FormDescription>
                                        Stock for this product when it has no
                                        variants.
                                      </FormDescription>
                                    </FormItem>
                                  )}
                                />
                              )}

                            {form.watch("trackInventory") && (
                              <FormField
                                control={form.control}
                                name="lowInventoryThreshold"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Low Inventory Threshold
                                    </FormLabel>
                                    <FormControl>
                                      <NumberInput
                                        step="1"
                                        min="1"
                                        placeholder="e.g. 5"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Get an email alert when stock reaches this
                                      level. Leave blank to disable.
                                    </FormDescription>
                                  </FormItem>
                                )}
                              />
                            )}
                          </>
                        )}

                        {/* Informational note when pool is active */}
                        {form.watch("baseInventoryUnitId") && (
                          <p className="text-muted-foreground text-sm">
                            Individual inventory tracking is disabled while a
                            base unit pool is selected. Manage pool stock from
                            the{" "}
                            <Link href="/admin/inventory" className="underline">
                              Inventory
                            </Link>{" "}
                            page.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Variants */}
                <VariantManager
                  variants={variants}
                  onChange={setVariants}
                  trackInventory={form.watch("trackInventory")}
                  basePrice={Math.round((form.watch("price") || 0) * 100)}
                  existingVariantOptions={getExistingVariantOptions(
                    product?.variants as
                      | Array<{ options: Record<string, string> }>
                      | undefined,
                  )}
                />
              </TabsContent>

              {collectionsEnabled && (
                <TabsContent value="collections" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Collections</CardTitle>
                      <CardDescription>
                        Assign this product to one or more collections
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {allCollections.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                          No collections yet.{" "}
                          <Link
                            href="/admin/collections/new"
                            className="underline"
                          >
                            Create one
                          </Link>{" "}
                          to get started.
                        </p>
                      ) : (
                        <>
                          {collectionIds.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5">
                              {collectionIds
                                .map((id) =>
                                  allCollections.find((c) => c.id === id),
                                )
                                .filter(
                                  (c): c is NonNullable<typeof c> =>
                                    c !== undefined,
                                )
                                .map((collection) => (
                                  <Badge
                                    key={collection.id}
                                    variant="secondary"
                                    className="gap-1 pr-1"
                                  >
                                    <span className="max-w-[160px] truncate">
                                      {collection.name}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={`Remove ${collection.name}`}
                                      className="ml-0.5 rounded-full hover:bg-black/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      onClick={() =>
                                        setCollectionIds((prev) =>
                                          prev.filter(
                                            (id) => id !== collection.id,
                                          ),
                                        )
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                            </div>
                          )}

                          <div className="relative mb-3">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              type="search"
                              placeholder="Search collections..."
                              value={collectionSearch}
                              onChange={(e) =>
                                setCollectionSearch(e.target.value)
                              }
                              className="pl-10"
                            />
                          </div>

                          <ScrollArea className="h-72 min-h-0 overflow-hidden">
                            <div className="space-y-2">
                              {(() => {
                                const filtered = collectionSearch.trim()
                                  ? allCollections.filter((c) =>
                                      c.name
                                        .toLowerCase()
                                        .includes(
                                          collectionSearch.toLowerCase().trim(),
                                        ),
                                    )
                                  : allCollections;

                                if (filtered.length === 0) {
                                  return (
                                    <p className="py-6 text-center text-sm text-gray-400">
                                      No collections match &ldquo;
                                      {collectionSearch}&rdquo;
                                    </p>
                                  );
                                }

                                return filtered.map((collection) => (
                                  <div
                                    key={collection.id}
                                    className="flex cursor-pointer items-center gap-3 rounded border p-3 hover:bg-gray-50"
                                    onClick={() =>
                                      setCollectionIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(collection.id))
                                          next.delete(collection.id);
                                        else next.add(collection.id);
                                        return [...next];
                                      })
                                    }
                                  >
                                    <span
                                      className="shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                    >
                                      <Checkbox
                                        checked={collectionIds.includes(
                                          collection.id,
                                        )}
                                        onCheckedChange={() =>
                                          setCollectionIds((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(collection.id))
                                              next.delete(collection.id);
                                            else next.add(collection.id);
                                            return [...next];
                                          })
                                        }
                                      />
                                    </span>
                                    <div className="flex-1">
                                      <p className="font-medium">
                                        {collection.name}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {collection._count.collectionProducts}{" "}
                                        product
                                        {collection._count.collectionProducts !==
                                        1
                                          ? "s"
                                          : ""}
                                      </p>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </ScrollArea>

                          <p className="mt-4 text-sm text-gray-500">
                            {collectionIds.length} collection
                            {collectionIds.length !== 1 ? "s" : ""} selected
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="seo" className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Meta Tags</CardTitle>
                        <CardDescription>
                          Override how this product appears in search engine results
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <InputFormField
                          form={form}
                          name="metaTitle"
                          label="Meta Title"
                          placeholder={form.watch("name") || "e.g., Classic White T-Shirt"}
                          description={`${form.watch("metaTitle")?.length ?? 0}/60 characters — leave blank to use product name`}
                          descriptionClassName="text-xs text-gray-500"
                        />

                        <TextareaFormField
                          form={form}
                          name="metaDescription"
                          label="Meta Description"
                          placeholder={form.watch("description") ?? "e.g., Soft, breathable cotton tee perfect for everyday wear."}
                          description={`${form.watch("metaDescription")?.length ?? 0}/160 characters — leave blank to use product description`}
                          descriptionClassName="text-xs text-gray-500"
                          rows={3}
                        />

                        <InputFormField
                          form={form}
                          name="metaKeywords"
                          label="Meta Keywords"
                          placeholder="e.g., t-shirt, cotton, classic, white"
                          description="Comma-separated keywords"
                          descriptionClassName="text-xs text-gray-500"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Open Graph Image</CardTitle>
                        <CardDescription>
                          Shown when this product is shared on social media. Recommended: 1200×630px.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <OgImageUploader
                          file={ogImageFile}
                          existingUrl={ogImageRemoved ? undefined : (product?.ogImage ?? undefined)}
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
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Search Result Preview</CardTitle>
                        <CardDescription>
                          How this product might appear in Google
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border bg-white p-4">
                          <div className="mb-1 truncate text-sm font-medium text-blue-600">
                            {seoPreviewTitle}
                          </div>
                          <div className="mb-1 text-xs text-green-700">
                            yourstore.com/products/{form.watch("slug") || "product-slug"}
                          </div>
                          <div className="line-clamp-2 text-sm text-gray-600">
                            {seoPreviewDesc}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Social Media Preview</CardTitle>
                        <CardDescription>
                          How this product looks when shared on social platforms
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SocialPreviewCard
                          title={seoPreviewTitle}
                          description={seoPreviewDesc}
                          ogImageFile={ogImageFile}
                          existingOgImage={ogImageRemoved ? undefined : (product?.ogImage ?? undefined)}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="additional" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional information</CardTitle>
                    <CardDescription>
                      Shown in the &quot;Additional Information&quot; tab on the
                      product page
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MinimalTiptapFormField
                      form={form}
                      name="additionalFields.additionalInformation"
                      output="json"
                      editorContentClassName={"p-4 min-h-[400px]"}
                      label="Additional information"
                      description='Shown in the "Additional Information" tab on the product page.'
                      galleriesEnabled={galleriesEnabled}
                    />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Feature highlights</CardTitle>
                      <CardDescription>
                        Key selling points shown as badges on the product page
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProductFeaturesField form={form} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Presentation</CardTitle>
                      <CardDescription>
                        Tagline and status badges for the product
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <InputFormField
                        form={form}
                        name="additionalFields.productTagline"
                        label="Product tagline"
                        description="On some templates this appears below the product name on the card."
                        placeholder="e.g., 'The perfect gift for any occasion'"
                      />

                      <SwitchFormField
                        form={form}
                        name="additionalFields.comingSoon"
                        label="Coming soon"
                        description="Show a 'Coming Soon' badge on the product page and card"
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </form>
      </Form>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{form.watch("name")}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteProductMutation.mutate(product?.id ?? "");
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
